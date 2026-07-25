import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions } from '@concert-crawl/db'
import {
  SP_POLICY,
  VENDOR_VALUES,
  deriveSourceCategory,
} from '@concert-crawl/types'
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
    vendor: z.enum(VENDOR_VALUES),
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

// Batch bundle schema (#832). Per-row rules mirror submissionBodySchema's
// price fields exactly; bundle-level fields are shared across every row.
// disputedSubmissionId is deliberately NOT accepted — counters stay
// single-row through the existing endpoint.
const batchTierRowSchema = z
  .object({
    priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
  })
  .refine((data) => !data.priceMax || data.priceMax >= data.priceMin, {
    message: "Ceiling can't be below floor.",
    path: ['priceMax'],
  })

const batchBodySchema = z
  .object({
    vendor: z.enum(VENDOR_VALUES),
    howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
    sourceCategory: z.enum(['boxoffice', 'standard', 'resale']).optional(),
    note: z.string().max(280).optional(),
    tiers: z.array(batchTierRowSchema).min(1).max(10),
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.tiers.map((row) => row.tier)).size === data.tiers.length,
    { message: 'Tiers must be unique within a batch.', path: ['tiers'] },
  )

const RATE_LIMIT_ERROR = `Rate limit: ${SP_POLICY.rateLimitMaxSubmissions} submissions per event per ${SP_POLICY.rateLimitHours}h`

// Executor type covering both the root db handle and a transaction handle,
// so countRecentActs can run inside the advisory-locked transactions below.
type DbExecutor =
  typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// Serializes concurrent submission attempts for one (user, event) pair. The
// check-then-insert sequences below are racy across API processes without
// it (TOCTOU): two simultaneous requests can both pass the pending/rate
// checks and both insert. A transaction-scoped advisory lock keyed on the
// pair makes the second request wait until the first commits, so its checks
// see the first insert. Lock scope is per-pair, so unrelated submissions
// never contend.
const acquireSubmissionLock = async (
  tx: DbExecutor,
  eventId: string,
  userId: string,
): Promise<void> => {
  await tx.execute(
    // Two-int variant: separate 32-bit hashes per key part collide far less
    // than one hash of the concatenated pair. A collision only costs
    // needless serialization, never correctness.
    sql`SELECT pg_advisory_xact_lock(hashtext(${eventId}), hashtext(${userId}))`,
  )
}

// One "contribution act" = one distinct created_at per (user, event) inside
// the 24h window (#876). All rows of a batch bundle land in one multi-row
// INSERT and share one statement_timestamp(), so a bundle counts as ONE act
// without any schema linkage. Counts every status (incl. stale) — the limit
// is about contribution frequency, not row visibility.
const countRecentActs = async (
  eventId: string,
  userId: string,
  executor: DbExecutor = db,
): Promise<number> => {
  const cutoff = new Date(
    Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000,
  )
  const [row] = await executor
    .select({
      acts: sql<number>`COUNT(DISTINCT ${priceSubmissions.createdAt})::int`,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        eq(priceSubmissions.userId, userId),
        gt(priceSubmissions.createdAt, cutoff),
      ),
    )
  return row ? Number(row.acts) : 0
}

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

  // #876 — how many contribution acts the caller has left for this event.
  // Separate count query: the list above excludes stale rows, but stale acts
  // still consume allowance. Anonymous callers get the full allowance.
  const actsUsed = userId != null ? await countRecentActs(eventId, userId) : 0
  const submissionsRemaining = Math.max(
    0,
    SP_POLICY.rateLimitMaxSubmissions - actsUsed,
  )

  return ctx.json({
    success: true,
    data: {
      submissions,
      alreadySubmitted: recentSubmission != null,
      submissionsRemaining,
      userSubmission,
    },
  })
})

// POST /v1/events/:id/price-submissions — authenticated users submit price data.
// @deprecated for the consumer submit form — SubmitPriceModal now posts to
// the /batch sibling below (#832). Kept for old clients and because the
// counter flow (disputedSubmissionId) depends on it. Do not remove.
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
          userId: priceSubmissions.userId,
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

      // Self-dispute guard. Mirrors POST /v1/submissions/:id/dispute at
      // apps/api/src/routes/submissions.ts:143-148 so the same 403 + error
      // string fires on BOTH counter-creation paths. Checked BEFORE the
      // duplicate-counter and status guards so a self-disputer who already
      // has a pending counter gets the actual reason (403) instead of a
      // 409/400 that misdescribes the problem.
      if (disputed.userId === userId) {
        return ctx.json(
          { success: false, error: 'Cannot dispute your own submission' },
          403,
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
    // Check-then-insert runs inside an advisory-locked transaction so
    // concurrent requests for the same (user, event) serialize; the HTTP
    // status is mapped from the outcome after commit.
    type SingleOutcome =
      | {
          kind: 'already_submitted'
          submission: typeof priceSubmissions.$inferSelect
        }
      | { kind: 'rate_limited' }
      // .returning() types its rows as possibly-undefined under
      // noUncheckedIndexedAccess; pass that through unchanged (the previous
      // non-transactional code did the same).
      | {
          kind: 'created'
          submission: typeof priceSubmissions.$inferSelect | undefined
        }

    const outcome = await db.transaction<SingleOutcome>(async (tx) => {
      await acquireSubmissionLock(tx, eventId, userId)

      // 409 — existing pending submission
      const existing = await tx
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
      const [existingRow] = existing
      if (existingRow) {
        return { kind: 'already_submitted', submission: existingRow }
      }

      // 429 — rate limit: SP_POLICY.rateLimitMaxSubmissions contribution
      // acts per (user, event) per 24h (#876).
      const actsUsed = await countRecentActs(eventId, userId, tx)
      if (actsUsed >= SP_POLICY.rateLimitMaxSubmissions) {
        return { kind: 'rate_limited' }
      }

      const [created] = await tx
        .insert(priceSubmissions)
        .values({
          eventId,
          userId,
          priceMin: String(body.priceMin),
          priceMax: body.priceMax != null ? String(body.priceMax) : null,
          tier: body.tier,
          vendor: body.vendor,
          howFound: body.howFound,
          // During the expand phase older clients omit sourceCategory.
          // Derive it from (vendor, howFound) via the shared helper so the
          // partial unique index + boxoffice staleness exemption apply
          // immediately instead of waiting for a later backfill.
          sourceCategory:
            body.sourceCategory ??
            deriveSourceCategory(body.vendor, body.howFound),
          // Submitter counts as observation #1 (1/2 confirmation model).
          // The DB default is also 1 — explicit value here is defensive
          // against default drift and easier to spot in code review.
          corroborationCount: 1,
          note: body.note ?? null,
          disputedSubmissionId: null,
          // statement_timestamp(), not the defaultNow() transaction-start
          // time: two concurrent transactions can share a start timestamp
          // even though the advisory lock serializes them, and identical
          // created_at values would undercount as one act in the
          // COUNT(DISTINCT created_at) rate check. The INSERT statement runs
          // after the lock is acquired, so its timestamp is strictly later
          // than any previously committed serialized act.
          createdAt: sql`statement_timestamp()`,
        })
        .returning()

      return { kind: 'created', submission: created }
    })

    if (outcome.kind === 'already_submitted') {
      return ctx.json(
        {
          success: false,
          error: 'Already submitted',
          submission: outcome.submission,
        },
        409,
      )
    }
    if (outcome.kind === 'rate_limited') {
      return ctx.json({ success: false, error: RATE_LIMIT_ERROR }, 429)
    }
    return ctx.json({ success: true, data: outcome.submission }, 201)
  },
)

// POST /v1/events/:id/price-submissions/batch — atomic multi-tier bundle
// (#832). A bundle of N tiers inserts as N ordinary pending rows in one
// statement: all rows or none. Rows are NOT linked after insert — the
// bundle is an ephemeral submission-time concept only (spec §1).
priceSubmissionsRouter.post(
  '/:id/price-submissions/batch',
  clerkAuth,
  requireAuth,
  zValidator('json', batchBodySchema, (result, ctx) => {
    if (!result.success) {
      // Surface per-row Zod failures as {index, tier, error} items so the
      // UI can annotate the exact tier panel (spec §2 error contract).
      // Issues outside tiers[<n>] (bundle-level fields, uniqueness refine)
      // stay in `details` only.
      const rowErrors = result.error.issues.flatMap((issue) => {
        const [rootKey, rowIndex] = issue.path
        if (rootKey !== 'tiers' || typeof rowIndex !== 'number') return []
        return [{ index: rowIndex, tier: null, error: issue.message }]
      })
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          errors: rowErrors,
          details: result.error.flatten(),
        },
        422,
      )
    }
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)
    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    // Content moderation for the bundle-level note — moderated once, exactly
    // like the single POST (spec §2: note is shared across all rows).
    if (body.note) {
      const modResult = moderateNote(body.note)
      if (!modResult.ok) {
        return ctx.json(
          { success: false, error: modResult.reason ?? 'Note rejected.' },
          422,
        )
      }
    }

    // Shared bundle-level derivation — identical for every row, mirroring
    // the single POST's expand-phase fallback.
    const sourceCategory =
      body.sourceCategory ?? deriveSourceCategory(body.vendor, body.howFound)

    // Check-then-insert runs inside an advisory-locked transaction (same
    // TOCTOU fix as the single POST) so concurrent batches for the same
    // (user, event) serialize. The multi-row INSERT stays atomic — all rows
    // land or none do (spec §2 "one request, one atomic insert") — the
    // wrapper adds serialization, not atomicity.
    type BatchOutcome =
      | {
          kind: 'duplicate_tiers'
          errors: { index: number; tier: string; error: string }[]
        }
      | { kind: 'rate_limited' }
      | {
          kind: 'created'
          rows: (typeof priceSubmissions.$inferSelect)[]
          actsUsed: number
        }

    const outcome = await db.transaction<BatchOutcome>(async (tx) => {
      await acquireSubmissionLock(tx, eventId, userId)

      // 422 — one pending submission per (event, user, tier). The single
      // POST checks per (event, user); the batch contract is per-tier (spec
      // §1 locked decision) so a user with a pending GA can still not
      // double-GA but the error names the exact panel to fix.
      const pendingRows = await tx
        .select({ tier: priceSubmissions.tier })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.eventId, eventId),
            eq(priceSubmissions.userId, userId),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
      const pendingTiers = new Set(pendingRows.map((row) => row.tier))
      const duplicateErrors = body.tiers.flatMap((row, rowIndex) =>
        pendingTiers.has(row.tier)
          ? [{ index: rowIndex, tier: row.tier, error: 'already_submitted' }]
          : [],
      )
      if (duplicateErrors.length > 0) {
        return { kind: 'duplicate_tiers', errors: duplicateErrors }
      }

      // 429 — the batch is ONE rate-limit hit (one contribution act) no
      // matter how many tier rows it inserts. Same distinct-createdAt count
      // as the single POST (#876); a batch over the limit is blocked as a
      // unit.
      const actsUsed = await countRecentActs(eventId, userId, tx)
      if (actsUsed >= SP_POLICY.rateLimitMaxSubmissions) {
        return { kind: 'rate_limited' }
      }

      const created = await tx
        .insert(priceSubmissions)
        .values(
          body.tiers.map((row) => ({
            eventId,
            userId,
            priceMin: String(row.priceMin),
            priceMax: row.priceMax != null ? String(row.priceMax) : null,
            tier: row.tier,
            vendor: body.vendor,
            howFound: body.howFound,
            sourceCategory,
            // Submitter counts as observation #1 (1/2 confirmation model),
            // same as the single POST.
            corroborationCount: 1,
            note: body.note ?? null,
            disputedSubmissionId: null,
            // statement_timestamp(), same rationale as the single POST: the
            // defaultNow() transaction-start time can collide across
            // lock-serialized concurrent transactions and undercount acts.
            // It is constant for every row of this one multi-row INSERT, so
            // the bundle still counts as exactly ONE distinct-createdAt act.
            createdAt: sql`statement_timestamp()`,
          })),
        )
        .returning()

      return { kind: 'created', rows: created, actsUsed }
    })

    if (outcome.kind === 'duplicate_tiers') {
      return ctx.json({ success: false, errors: outcome.errors }, 422)
    }
    if (outcome.kind === 'rate_limited') {
      return ctx.json({ success: false, error: RATE_LIMIT_ERROR }, 429)
    }

    // submissionsRemaining lets the success surface (MTAddTierSuccess) gate
    // its add-tier pills without a follow-up GET (#876). This bundle just
    // consumed one act on top of actsUsed.
    const submissionsRemaining = Math.max(
      0,
      SP_POLICY.rateLimitMaxSubmissions - (outcome.actsUsed + 1),
    )

    return ctx.json(
      { success: true, data: outcome.rows, submissionsRemaining },
      201,
    )
  },
)
