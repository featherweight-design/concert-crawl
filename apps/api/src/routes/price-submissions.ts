import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions } from '@concert-crawl/db'
import { SP_POLICY, deriveSourceCategory } from '@concert-crawl/types'
import {
  clerkAuth,
  requireAuth,
  getAuthUser,
  getAuthOptional,
} from '../middleware/auth.js'
import { moderateNote } from '../lib/moderate-note.js'
import { isPendingCounterUniqueViolation } from '../lib/pg-errors.js'

const submissionBodySchema = z
  .object({
    priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
    howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
    // sourceCategory is the new top-level provenance choice (issue #641).
    // Optional during the expand phase — the submit form (PR 4) will start
    // sending it, but legacy submitters and old clients still post without
    // it. When absent, the handler derives a value from (vendor, howFound)
    // using the same heuristic as migration 0040's backfill, so every new
    // submission persists a non-null source_category (migration 0040 already
    // backfilled all rows that existed before this PR).
    sourceCategory: z.enum(['boxoffice', 'standard', 'resale']).optional(),
    note: z.string().max(280).optional(),
    disputedSubmissionId: z.string().uuid().optional(),
  })
  .refine((data) => !data.priceMax || data.priceMax >= data.priceMin, {
    message: "Ceiling can't be below floor.",
    path: ['priceMax'],
  })

export const priceSubmissionsRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  priceSubmissionsRouter.use('*', clerkAuth, requireAuth)
}

// GET /v1/events/:id/price-submissions — optional auth; returns all non-stale submissions
priceSubmissionsRouter.get('/:id/price-submissions', clerkAuth, async (ctx) => {
  const { id: eventId } = ctx.req.param()
  const authUser = getAuthOptional(ctx)
  const userId = authUser?.userId ?? null

  const subRows = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      userId: priceSubmissions.userId,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      tier: priceSubmissions.tier,
      vendor: priceSubmissions.vendor,
      howFound: priceSubmissions.howFound,
      sourceCategory: priceSubmissions.sourceCategory,
      disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
      createdAt: priceSubmissions.createdAt,
      updatedAt: priceSubmissions.updatedAt,
      confirms: sql<number>`(
          SELECT COUNT(*)::int FROM submission_confirms
          WHERE submission_confirms.submission_id = ${priceSubmissions.id}
        )`,
      byYou: sql<boolean>`EXISTS (
          SELECT 1 FROM submission_confirms sc
          WHERE sc.submission_id = ${priceSubmissions.id}
            AND sc.user_id = ${userId}
        )`,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        ne(priceSubmissions.status, 'stale'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))

  const submissions = subRows.map((row) => ({
    ...row,
    confirms: Number(row.confirms),
    byYou: Boolean(row.byYou),
  }))

  const userSubmission =
    userId != null
      ? (submissions.find(
          (sub) => sub.userId === userId && sub.status === 'pending',
        ) ?? null)
      : null

  // Block resubmission if the user has any non-stale submission within the last 24h,
  // including approved (corroborated) ones. This prevents the submit form from
  // reappearing after an admin approves the user's price.
  const rateLimitCutoff = new Date(
    Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000,
  )
  const recentSubmission =
    userId != null
      ? (submissions.find(
          (sub) =>
            sub.userId === userId &&
            (sub.status === 'pending' || sub.status === 'corroborated') &&
            new Date(sub.createdAt) > rateLimitCutoff,
        ) ?? null)
      : null

  return ctx.json({
    success: true,
    data: {
      submissions,
      alreadySubmitted: recentSubmission != null,
      userSubmission,
    },
  })
})

// POST /v1/events/:id/price-submissions — authenticated users submit price data
priceSubmissionsRouter.post(
  '/:id/price-submissions',
  clerkAuth,
  requireAuth,
  zValidator('json', submissionBodySchema, (result, ctx) => {
    if (!result.success)
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        422,
      )
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    // Content moderation for note
    if (body.note) {
      const modResult = moderateNote(body.note)
      if (!modResult.ok) {
        return ctx.json(
          { success: false, error: modResult.reason ?? 'Note rejected.' },
          422,
        )
      }
    }

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)
    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    // Counter-creation path (CounterSubmitSheet posts here when challenging
    // a corroborated parent). This path has its own contract:
    //   1. Parent must exist + be 'corroborated' (existing validation).
    //   2. At most one pending counter per parent (spec §4.6) — both an
    //      app-level pre-check and a 23505 translation around the insert,
    //      mirroring submissions.ts:149-176 + 216-232.
    //   3. Insert + parent-flip happen in the SAME transaction so the parent
    //      can never be left on 'corroborated' while a counter is pending.
    //   4. Slot identity (tier, vendor, sourceCategory) is INHERITED from
    //      the parent. The submitter's body values for these are ignored —
    //      a counter that landed in a different slot would 409 at admin
    //      resolution time against the spec §4.3 same-slot assertions. The
    //      submitter's `howFound` IS preserved (it's how THIS person saw
    //      the price, not slot identity). Submitter's priceMin/priceMax/note
    //      ARE preserved (these ARE the contest claim).
    //   5. The per-user-per-event rate-limit and 'already submitted' check
    //      that gate the non-counter path are bypassed — a counter is a
    //      response to a contest, not a fresh submission attempt.
    if (body.disputedSubmissionId) {
      const [disputed] = await db
        .select({
          id: priceSubmissions.id,
          status: priceSubmissions.status,
          tier: priceSubmissions.tier,
          vendor: priceSubmissions.vendor,
          sourceCategory: priceSubmissions.sourceCategory,
          howFound: priceSubmissions.howFound,
        })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.id, body.disputedSubmissionId),
            eq(priceSubmissions.eventId, eventId),
          ),
        )
        .limit(1)
      if (!disputed) {
        return ctx.json(
          { success: false, error: 'Disputed submission not found' },
          404,
        )
      }

      // 1-pending-counter-per-parent invariant (spec §4.6). Checked BEFORE
      // the 'corroborated' status guard so a second concurrent challenger
      // sees the specific 409 "already pending" message instead of falling
      // through to the 400 "Can only dispute a corroborated submission"
      // (the parent flips to 'disputed' the moment the first counter lands).
      // The DB partial unique index `price_submissions_pending_counter_unique_idx`
      // (migration 0041) is the source of truth; this app-level SELECT
      // returns a clean 409 instead of letting consumers see a raw
      // unique_violation. The try/catch below catches the narrow race where
      // two requests pass this check before either INSERT lands.
      const [existingCounter] = await db
        .select({ id: priceSubmissions.id })
        .from(priceSubmissions)
        .where(
          and(
            eq(
              priceSubmissions.disputedSubmissionId,
              body.disputedSubmissionId,
            ),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
        .limit(1)
      if (existingCounter) {
        return ctx.json(
          {
            success: false,
            error:
              'Another challenge is already pending against this submission.',
          },
          409,
        )
      }

      if (disputed.status !== 'corroborated') {
        return ctx.json(
          {
            success: false,
            error: 'Can only dispute a corroborated submission',
          },
          400,
        )
      }

      // Slot identity inherits from parent. `sourceCategory` may be NULL on
      // legacy rows, so derive from (parent.vendor, parent.howFound) — the
      // same fallback the dispute route uses at submissions.ts:197-199 — so
      // every counter lands with a non-null source_category that matches the
      // partial unique index semantics.
      const inheritedTier = disputed.tier
      const inheritedVendor = disputed.vendor
      const inheritedSourceCategory =
        disputed.sourceCategory ??
        deriveSourceCategory(disputed.vendor, disputed.howFound)
      const parentId = body.disputedSubmissionId

      try {
        const created = await db.transaction(async (tx) => {
          const [child] = await tx
            .insert(priceSubmissions)
            .values({
              eventId,
              userId,
              priceMin: String(body.priceMin),
              priceMax: body.priceMax != null ? String(body.priceMax) : null,
              tier: inheritedTier,
              vendor: inheritedVendor,
              // howFound is NOT slot identity — it's how THIS submitter saw
              // the price. Preserve submitter's value. (This intentionally
              // differs from /v1/submissions/:id/dispute which inherits
              // howFound from the parent; that small inconsistency is out
              // of scope for this PR.)
              howFound: body.howFound,
              sourceCategory: inheritedSourceCategory,
              corroborationCount: 1,
              note: body.note ?? null,
              disputedSubmissionId: parentId,
              status: 'pending',
            })
            .returning()

          if (!child) {
            throw new Error('Counter insert returned no rows')
          }

          await tx
            .update(priceSubmissions)
            .set({ status: 'disputed', updatedAt: sql`now()` })
            .where(eq(priceSubmissions.id, parentId))

          return child
        })

        return ctx.json({ success: true, data: created }, 201)
      } catch (err) {
        // Belt-and-braces: translate the DB unique_violation on the partial
        // unique index into the same clean 409 the pre-insert SELECT returns.
        if (isPendingCounterUniqueViolation(err)) {
          return ctx.json(
            {
              success: false,
              error:
                'Another challenge is already pending against this submission.',
            },
            409,
          )
        }
        throw err
      }
    }

    // Non-counter path (no disputedSubmissionId) — fresh submission attempt.

    // 409 — existing pending submission
    const existing = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.userId, userId),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1)
    if (existing.length > 0) {
      return ctx.json(
        {
          success: false,
          error: 'Already submitted',
          submission: existing[0],
        },
        409,
      )
    }

    // 429 — rate limit: 1 submission per user per event per 24h
    const cutoff = new Date(
      Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000,
    )
    const recent = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.userId, userId),
          gt(priceSubmissions.createdAt, cutoff),
        ),
      )
      .limit(1)
    if (recent.length > 0) {
      return ctx.json(
        { success: false, error: 'Rate limit: 1 submission per 24h' },
        429,
      )
    }

    const [created] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId,
        priceMin: String(body.priceMin),
        priceMax: body.priceMax != null ? String(body.priceMax) : null,
        tier: body.tier,
        vendor: body.vendor,
        howFound: body.howFound,
        // During the expand phase older clients omit sourceCategory. Derive
        // it from (vendor, howFound) via the shared helper so the partial
        // unique index + boxoffice staleness exemption apply immediately
        // instead of waiting for a later backfill.
        sourceCategory:
          body.sourceCategory ??
          deriveSourceCategory(body.vendor, body.howFound),
        // Submitter counts as observation #1 (1/2 confirmation model). The
        // DB default is also 1 — explicit value here is defensive against
        // default drift and easier to spot in code review.
        corroborationCount: 1,
        note: body.note ?? null,
        disputedSubmissionId: null,
      })
      .returning()

    return ctx.json({ success: true, data: created }, 201)
  },
)
