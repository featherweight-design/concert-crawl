import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import {
  db,
  events,
  priceSubmissions,
  userProfiles,
  userRoles,
  venues,
} from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import { writeContestNotifications } from '../../lib/contest-notifications.js'
import { narrowLastAdminAction } from '../../lib/last-admin-action.js'
import type { AdminVariables } from './index.js'

export const contestsAdminRouter = new Hono<AdminVariables>()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// GET /v1/admin/contests/prices — paginated open price contests
//
// The query pivots around the COUNTER row (priceSubmissions where
// status='pending' AND disputedSubmissionId IS NOT NULL), not the parent's
// status. Spec §6.1 + §4.6: the §4.6 partial unique index guarantees at most
// one pending counter per parent, so one counter row = one contest. Anchoring
// on the counter lets us ORDER BY counter.createdAt (the "filedAt" per spec)
// and survives the two creation paths historically leaving the parent in
// slightly different states (see plan Task 5 + 5b).
contestsAdminRouter.get(
  '/prices',
  zValidator('query', listQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422)
    }
  }),
  async (ctx) => {
    const { limit, offset } = ctx.req.valid('query')

    // parentAlias = the disputed parent submission (self-join target).
    const parentAlias = alias(priceSubmissions, 'parent')
    const counterRows = await db
      .select({
        contestId: parentAlias.id,
        eventId: parentAlias.eventId,
        eventTitle: events.title,
        venueName: venues.name,
        eventDate: events.date,
        tier: parentAlias.tier,
        sourceCategory: parentAlias.sourceCategory,
        // Parent fields (the disputed corroborated submission)
        parentId: parentAlias.id,
        parentPriceMin: parentAlias.priceMin,
        parentPriceMax: parentAlias.priceMax,
        parentVendor: parentAlias.vendor,
        parentUserId: parentAlias.userId,
        parentObservedAt: parentAlias.createdAt,
        parentLastUpdatedAt: parentAlias.updatedAt,
        parentNote: parentAlias.note,
        // corroborationCount already includes the submitter's implicit
        // observation (1/2 model: default flipped 0→1 in PR #705 with the
        // (COUNT(submission_confirms)+1) backfill). This is the right field
        // for the "fans" count, NOT a SELECT COUNT(*) on submission_confirms
        // which would undercount by 1.
        parentCorroborationCount: parentAlias.corroborationCount,
        // Counter fields (the pending challenger). createdAt = filedAt per
        // spec §6.1.
        counterId: priceSubmissions.id,
        counterPriceMin: priceSubmissions.priceMin,
        counterPriceMax: priceSubmissions.priceMax,
        counterVendor: priceSubmissions.vendor,
        counterUserId: priceSubmissions.userId,
        counterObservedAt: priceSubmissions.createdAt,
        counterNote: priceSubmissions.note,
        // Counter confirms mirror the parent shape — drives the queue row's
        // counter attribution text per design table §2. corroborationCount on
        // a pending counter starts at 1 (submitter = observation #1).
        counterCorroborationCount: priceSubmissions.corroborationCount,
        filedAt: priceSubmissions.createdAt,
      })
      .from(priceSubmissions)
      .innerJoin(
        parentAlias,
        eq(parentAlias.id, priceSubmissions.disputedSubmissionId),
      )
      .innerJoin(events, eq(events.id, parentAlias.eventId))
      .innerJoin(venues, eq(venues.id, events.venueId))
      .where(
        and(
          eq(priceSubmissions.status, 'pending'),
          isNotNull(priceSubmissions.disputedSubmissionId),
        ),
      )
      .orderBy(asc(priceSubmissions.createdAt), asc(priceSubmissions.id))
      .limit(limit)
      .offset(offset)

    // Resolve handles for every userId surfaced across both sides via a
    // single LEFT JOIN-style lookup. Handle may be null if a profile wasn't
    // created yet; userId is canonical.
    const allUserIds = Array.from(
      new Set(
        [
          ...counterRows.map((row) => row.parentUserId),
          ...counterRows.map((row) => row.counterUserId),
        ].filter((uid): uid is string => uid !== null),
      ),
    )
    const handleMap = new Map<string, string | null>()
    if (allUserIds.length > 0) {
      const handles = await db
        .select({
          userId: userProfiles.userId,
          handle: userProfiles.handle,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, allUserIds))
      for (const row of handles) {
        handleMap.set(row.userId, row.handle ?? null)
      }
    }

    // `fans` count comes from corroborationCount directly (it already
    // includes the submitter's implicit observation #1). Admin=0 stays as a
    // placeholder until the submission_confirms table grows a method/kind
    // that distinguishes admin approvals from fan confirms. No separate
    // count query needed.

    const items = counterRows.map((row) => ({
      contestId: row.contestId,
      eventId: row.eventId,
      eventTitle: row.eventTitle ?? '',
      venueName: row.venueName ?? '',
      eventDate: row.eventDate ?? '',
      tier: row.tier,
      sourceCategory: row.sourceCategory,
      parent: {
        id: row.parentId,
        priceMin: row.parentPriceMin,
        priceMax: row.parentPriceMax,
        vendor: row.parentVendor,
        submitter: {
          // Pass `string | null` through verbatim — see detail handler's
          // submitter comment for rationale (don't coerce a null userId
          // into a zero-length string).
          userId: row.parentUserId,
          handle: row.parentUserId
            ? (handleMap.get(row.parentUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.parentCorroborationCount,
          admin: 0,
        },
        observedAt: row.parentObservedAt.toISOString(),
        lastUpdatedAt: row.parentLastUpdatedAt.toISOString(),
        note: row.parentNote ?? null,
      },
      counter: {
        id: row.counterId,
        priceMin: row.counterPriceMin,
        priceMax: row.counterPriceMax,
        vendor: row.counterVendor,
        submitter: {
          // Same as parent.submitter.userId — string | null.
          userId: row.counterUserId,
          handle: row.counterUserId
            ? (handleMap.get(row.counterUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.counterCorroborationCount,
          admin: 0,
        },
        observedAt: row.counterObservedAt.toISOString(),
        note: row.counterNote ?? null,
      },
      filedAt: row.filedAt.toISOString(),
    }))

    // `total` counts contests by their pending counter (matching the items
    // shape), not by parents with status='disputed' — those numbers can
    // differ if a parent was flagged disputed but the counter has since been
    // withdrawn or archived (spec §4.6).
    const [totalRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.status, 'pending'),
          isNotNull(priceSubmissions.disputedSubmissionId),
        ),
      )

    return ctx.json({
      success: true,
      data: { items, total: totalRow?.value ?? 0, limit, offset },
    })
  },
)

const detailParamsSchema = z.object({
  contestId: z.string().uuid(),
})

// GET /v1/admin/contests/prices/:contestId — full detail for one contest.
//
// Mirrors a single row from the list endpoint (§6.1) plus an empty `history`
// array placeholder per spec §6.2. The path param is the PARENT submission id
// (the contest's stable cursor — same field the list endpoint surfaces as
// `contestId`, see line ~45).
//
// Unlike the list endpoint, this handler does NOT filter the counter by
// status='pending'. The AdminDisputePanel renders read-only banners off the
// actual parent/counter statuses for already-resolved or deferred contests, so
// the detail endpoint must surface them as-is. The counter is fetched by
// ORDER BY createdAt DESC LIMIT 1 — the §4.6 partial unique index guarantees
// at most one pending counter per parent, but historical resolved counters can
// stack up after multiple contests on the same parent. Most-recent-counter is
// the right surface for the panel.
contestsAdminRouter.get(
  '/prices/:contestId',
  zValidator('param', detailParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400)
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param')

    // Parent = the row at :contestId. Join events + venues for the projection.
    const [parentRow] = await db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        eventTitle: events.title,
        venueName: venues.name,
        eventDate: events.date,
        tier: priceSubmissions.tier,
        sourceCategory: priceSubmissions.sourceCategory,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        vendor: priceSubmissions.vendor,
        userId: priceSubmissions.userId,
        observedAt: priceSubmissions.createdAt,
        lastUpdatedAt: priceSubmissions.updatedAt,
        note: priceSubmissions.note,
        status: priceSubmissions.status,
        // corroborationCount already includes the submitter's implicit
        // observation (1/2 model). Used directly as `confirms.fans`; admin=0
        // is a placeholder until submission_confirms grows an admin-method
        // discriminator. Same comment as the list endpoint above.
        corroborationCount: priceSubmissions.corroborationCount,
        // Surfaced so AdminDisputePanel's read-only banner can re-display the
        // admin's resolution rationale to admins re-visiting a resolved
        // contest (spec §4 line 245). Null on actionable contests.
        archivedReason: priceSubmissions.archivedReason,
      })
      .from(priceSubmissions)
      .innerJoin(events, eq(events.id, priceSubmissions.eventId))
      .innerJoin(venues, eq(venues.id, events.venueId))
      .where(eq(priceSubmissions.id, contestId))
      .limit(1)

    if (!parentRow) {
      return ctx.json({ success: false, error: 'Contest not found' }, 404)
    }

    // Counter = the most recent row whose disputedSubmissionId = parent.id.
    // No status filter (spec §6.2) — read-only banners for resolved/deferred
    // states render off the actual counter.status.
    const [counterRow] = await db
      .select({
        id: priceSubmissions.id,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        vendor: priceSubmissions.vendor,
        userId: priceSubmissions.userId,
        observedAt: priceSubmissions.createdAt,
        note: priceSubmissions.note,
        status: priceSubmissions.status,
        corroborationCount: priceSubmissions.corroborationCount,
        lastAdminActionAt: priceSubmissions.lastAdminActionAt,
        lastAdminActionKind: priceSubmissions.lastAdminActionKind,
        // Same as parent.archivedReason — surfaces the admin's resolution
        // rationale on the loser side of an already-resolved contest.
        archivedReason: priceSubmissions.archivedReason,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.disputedSubmissionId, contestId))
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(1)

    if (!counterRow) {
      // The parent exists but no row references it as a dispute — caller
      // passed a non-contest submission id. 404 keeps the contract simple:
      // either we have both sides, or we don't have a contest.
      return ctx.json({ success: false, error: 'Counter not found' }, 404)
    }

    // Resolve handles for both sides via a single LEFT JOIN-style lookup.
    // Same pattern as the list endpoint.
    const userIds = [parentRow.userId, counterRow.userId].filter(
      (uid): uid is string => uid !== null,
    )
    const handleMap = new Map<string, string | null>()
    if (userIds.length > 0) {
      const handles = await db
        .select({
          userId: userProfiles.userId,
          handle: userProfiles.handle,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, userIds))
      for (const row of handles) {
        handleMap.set(row.userId, row.handle ?? null)
      }
    }

    // Pair-narrow the counter's engagement signal so kind + at can't drift.
    // Shared helper in apps/api/src/lib/last-admin-action.ts — same defensive
    // treatment as buildCounter in aggregate-by-tier.ts and the
    // counterSubmission projection in events.ts.
    const counterLastAction = narrowLastAdminAction(
      counterRow.lastAdminActionKind,
      counterRow.lastAdminActionAt,
    )

    return ctx.json({
      success: true,
      data: {
        contestId: parentRow.id,
        eventId: parentRow.eventId,
        eventTitle: parentRow.eventTitle ?? '',
        venueName: parentRow.venueName ?? '',
        eventDate: parentRow.eventDate ?? '',
        tier: parentRow.tier,
        sourceCategory: parentRow.sourceCategory,
        parent: {
          id: parentRow.id,
          priceMin: parentRow.priceMin,
          priceMax: parentRow.priceMax,
          vendor: parentRow.vendor,
          submitter: {
            // Preserve null when the row truly has no submitter (legacy /
            // anonymous backfill rows) rather than coercing to ''. The
            // empty string was a lie — it told the wire the user existed
            // but had a zero-length id. UI reads only `handle` for
            // rendering; passing `string | null` through keeps the type
            // honest with the DB column.
            userId: parentRow.userId,
            handle: parentRow.userId
              ? (handleMap.get(parentRow.userId) ?? null)
              : null,
          },
          confirms: {
            fans: parentRow.corroborationCount,
            admin: 0,
          },
          observedAt: parentRow.observedAt.toISOString(),
          lastUpdatedAt: parentRow.lastUpdatedAt.toISOString(),
          note: parentRow.note ?? null,
          status: parentRow.status,
          archivedReason: parentRow.archivedReason ?? null,
        },
        counter: {
          id: counterRow.id,
          priceMin: counterRow.priceMin,
          priceMax: counterRow.priceMax,
          vendor: counterRow.vendor,
          submitter: {
            // Same rationale as parent.submitter.userId — string | null,
            // not coerced to ''.
            userId: counterRow.userId,
            handle: counterRow.userId
              ? (handleMap.get(counterRow.userId) ?? null)
              : null,
          },
          confirms: {
            fans: counterRow.corroborationCount,
            admin: 0,
          },
          observedAt: counterRow.observedAt.toISOString(),
          note: counterRow.note ?? null,
          status: counterRow.status,
          // Paired above so an unrecognized kind in the column never leaves
          // a half-populated pair (kind=null, at=<timestamp>) on the wire.
          lastAdminActionAt: counterLastAction.at,
          lastAdminActionKind: counterLastAction.kind,
          archivedReason: counterRow.archivedReason ?? null,
        },
        filedAt: counterRow.observedAt.toISOString(),
        history: [],
      },
    })
  },
)

const resolveParamsSchema = z.object({
  contestId: z.string().uuid(),
})

const resolveBodySchema = z.object({
  resolution: z.enum(['parent_wins', 'challenger_wins']),
  reason: z.string().min(10).max(2000),
})

// POST /v1/admin/contests/prices/:contestId/resolve — atomic resolution.
//
// Spec §4.3, §6.3. The contestId path param is the PARENT submission id
// (consistent with the list + detail endpoints).
//
// The handler runs all DB mutations inside one transaction with SELECT FOR
// UPDATE on both rows up front. Sanity gates inside the transaction return a
// discriminated `precondition_failed` outcome that maps to a 409 response
// (with the precondition's reason in the body) — NOT 200, NOT a partial
// commit. Same-slot assertions (event_id / tier / source_category) defend
// against any upstream bug that could land a counter in a different slot;
// without them, a malformed counter could propagate the wrong price to the
// events projection.
//
// On status flips for BOTH winner and loser we clear lastAdminActionKind +
// lastAdminActionAt so the consumer-facing "Admin requested more info" pill
// from a previous defer doesn't persist after resolution.
//
// The events projection update is gated on event.priceSource being
// 'community' or NULL — we never overwrite a Ticketmaster/AXS/etc.-sourced
// price even if a community contest landed on the same slot. The cred award
// (+1 priceCredScore to the winner's submitter) happens regardless of the
// projection gate.
//
// Orphan cleanup archives any OTHER pending counters against the same parent
// inside the transaction. The §4.6 partial unique index makes this dead-by-
// construction in steady state, but the branch is kept defensively for
// migration-window in-flight rows.
//
// Audit + notification writes happen OUTSIDE the transaction (after commit)
// so a Sentry-tagged failure in either telemetry path can't roll back the
// resolution. Audit is driven by ctx.set('auditAction', ...) etc. and handled
// by the middleware in apps/api/src/routes/admin/index.ts. Notifications are
// fanned out via writeContestNotifications in apps/api/src/lib/contest-
// notifications.ts (helper extracted in Task 10) — it dedupes parent ===
// challenger and swallows insert failures internally.
contestsAdminRouter.post(
  '/prices/:contestId/resolve',
  zValidator('param', resolveParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400)
    }
  }),
  zValidator('json', resolveBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      )
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param')
    const { resolution, reason } = ctx.req.valid('json')
    const admin = getAuthUser(ctx)

    type ResolveOutcome =
      | {
          ok: 'committed'
          parent: typeof priceSubmissions.$inferSelect
          challenger: typeof priceSubmissions.$inferSelect
          eventPriceUpdated: boolean
          orphanedCounterIds: string[]
          before: {
            parent: {
              status: string
              priceMin: string
              priceMax: string | null
            }
            challenger: {
              status: string
              priceMin: string
              priceMax: string | null
            }
          }
        }
      | { ok: 'not_found' }
      | { ok: 'precondition_failed'; reason: string }

    const outcome: ResolveOutcome = await db.transaction(async (tx) => {
      // Lock the parent row first.
      const [parent] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, contestId))
        .limit(1)
        .for('update')
      if (!parent) return { ok: 'not_found' }

      // Lock the (single, per §4.6) pending counter. If a previous resolution
      // already archived it, we surface precondition_failed instead of
      // silently no-oping.
      const [challenger] = await tx
        .select()
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, contestId),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
        .limit(1)
        .for('update')
      if (!challenger) {
        return {
          ok: 'precondition_failed',
          reason: 'No pending counter exists for this contest.',
        }
      }

      // Sanity gates.
      if (parent.disputedSubmissionId !== null) {
        return {
          ok: 'precondition_failed',
          reason: 'Target row is a counter, not a parent.',
        }
      }
      if (parent.status !== 'disputed' && parent.status !== 'corroborated') {
        return {
          ok: 'precondition_failed',
          reason: `Parent status is ${parent.status}; cannot resolve.`,
        }
      }
      if (challenger.status !== 'pending') {
        return {
          ok: 'precondition_failed',
          reason: `Challenger status is ${challenger.status}; cannot resolve.`,
        }
      }
      // Same-slot assertions — defense-in-depth against a counter being
      // inserted with a mismatched slot. Without these, a parameter mix-up
      // could propagate the wrong price into the events row.
      if (parent.eventId !== challenger.eventId) {
        return {
          ok: 'precondition_failed',
          reason: 'Parent and challenger belong to different events.',
        }
      }
      if (parent.tier !== challenger.tier) {
        return {
          ok: 'precondition_failed',
          reason: `Parent tier ${parent.tier} does not match challenger tier ${challenger.tier}.`,
        }
      }
      // Treat NULL source_category as "matches anything." Legacy rows
      // pre-PR-#651 have parent.sourceCategory = null; the counter-creation
      // routes explicitly derive a non-null value (see submissions.ts and
      // price-submissions.ts), so a strict `!==` check permanently locks
      // those contests at the same-slot assertion. The original safety
      // invariant — both sides non-null and unequal — is preserved.
      if (
        parent.sourceCategory !== null &&
        challenger.sourceCategory !== null &&
        parent.sourceCategory !== challenger.sourceCategory
      ) {
        return {
          ok: 'precondition_failed',
          reason: `Parent source_category ${parent.sourceCategory} does not match challenger source_category ${challenger.sourceCategory}.`,
        }
      }

      const before = {
        parent: {
          status: parent.status,
          priceMin: parent.priceMin,
          priceMax: parent.priceMax,
        },
        challenger: {
          status: challenger.status,
          priceMin: challenger.priceMin,
          priceMax: challenger.priceMax,
        },
      }

      // Read the event row inside the transaction to gate the projection
      // update on priceSource — we never overwrite a non-community headline
      // (ticketmaster/axs/etc.) even when a community contest resolves on the
      // same slot.
      const [eventRow] = await tx
        .select({ priceSource: events.priceSource })
        .from(events)
        .where(eq(events.id, parent.eventId))
        .limit(1)
      if (!eventRow) {
        // Should be unreachable given the FK from price_submissions.event_id,
        // but treat as precondition_failed rather than a 500 if it ever fires.
        return {
          ok: 'precondition_failed',
          reason: 'Event row missing for parent submission.',
        }
      }
      const projectionAllowed =
        eventRow.priceSource === null || eventRow.priceSource === 'community'

      let eventPriceUpdated = false

      if (resolution === 'challenger_wins') {
        // Winner = challenger → corroborated. Loser = parent → archived.
        // Clearing lastAdminActionKind/At on BOTH rows ensures any prior
        // "Admin requested more info" pill from a defer doesn't outlive the
        // resolution (spec §4.5).
        await tx
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, challenger.id))
        await tx
          .update(priceSubmissions)
          .set({
            status: 'archived',
            archivedReason: reason,
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, parent.id))
        if (projectionAllowed) {
          await tx
            .update(events)
            .set({
              ticketPriceMin: challenger.priceMin,
              ticketPriceMax: challenger.priceMax ?? null,
              priceSource: 'community',
              updatedAt: sql`now()`,
            })
            .where(eq(events.id, parent.eventId))
          eventPriceUpdated = true
        }
        if (challenger.userId !== null) {
          await tx
            .update(userRoles)
            .set({ priceCredScore: sql`${userRoles.priceCredScore} + 1` })
            .where(eq(userRoles.userId, challenger.userId))
        }
      } else {
        // parent_wins: parent stays canonical → corroborated.
        // counter loses → archived with admin's reason.
        await tx
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, parent.id))
        await tx
          .update(priceSubmissions)
          .set({
            status: 'archived',
            archivedReason: reason,
            lastAdminActionKind: null,
            lastAdminActionAt: null,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, challenger.id))
        // events row already reflects parent's price; no propagation.
        // Parent submitter already received cred when initially corroborated;
        // no re-award.
      }

      // Orphan cleanup — archive any OTHER pending counters against this
      // parent. Dead-by-construction post-§4.6 unique index, but kept for
      // migration-window in-flight rows. The ne() guard avoids double-touching
      // the winner/loser the handler just flipped.
      const orphans = await tx
        .update(priceSubmissions)
        .set({
          status: 'archived',
          // Reason text must stay accurate regardless of resolution
          // direction — the parent is NOT always archived (parent_wins
          // leaves it corroborated). "Superseded by contest resolution"
          // works for both branches and points readers at the resolution
          // audit row by parent id (= contestId).
          archivedReason: `Superseded by contest resolution ${parent.id}`,
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, parent.id),
            eq(priceSubmissions.status, 'pending'),
            ne(priceSubmissions.id, challenger.id),
          ),
        )
        .returning({ id: priceSubmissions.id })
      const orphanedCounterIds = orphans.map((row) => row.id)

      const [parentAfter] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, parent.id))
        .limit(1)
      const [challengerAfter] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, challenger.id))
        .limit(1)
      if (!parentAfter || !challengerAfter) {
        throw new Error(
          'Post-resolution read failed — parent or challenger missing.',
        )
      }

      return {
        ok: 'committed',
        parent: parentAfter,
        challenger: challengerAfter,
        eventPriceUpdated,
        orphanedCounterIds,
        before,
      }
    })

    if (outcome.ok === 'not_found') {
      return ctx.json({ success: false, error: 'Contest not found' }, 404)
    }
    if (outcome.ok === 'precondition_failed') {
      return ctx.json(
        {
          success: false,
          error: outcome.reason,
          code: 'precondition_failed',
        },
        409,
      )
    }

    // Audit middleware reads these from context after the response is built.
    // Failures inside the middleware are swallowed there; the resolution
    // itself is already committed.
    ctx.set('auditActorId', admin.userId)
    ctx.set('auditAction', 'contest.resolve')
    ctx.set('auditTargetId', contestId)
    ctx.set('auditMeta', {
      resolution,
      parentId: outcome.parent.id,
      challengerId: outcome.challenger.id,
      eventId: outcome.parent.eventId,
      tier: outcome.parent.tier,
      sourceCategory: outcome.parent.sourceCategory,
      reason,
      parentBefore: outcome.before.parent,
      parentAfter: {
        status: outcome.parent.status,
        priceMin: outcome.parent.priceMin,
        priceMax: outcome.parent.priceMax,
      },
      challengerBefore: outcome.before.challenger,
      challengerAfter: {
        status: outcome.challenger.status,
        priceMin: outcome.challenger.priceMin,
        priceMax: outcome.challenger.priceMax,
      },
      eventPriceUpdated: outcome.eventPriceUpdated,
      orphanedCounterIds: outcome.orphanedCounterIds,
    })

    // Notification fan-out lives in apps/api/src/lib/contest-notifications.ts
    // (extracted in Task 10). The helper handles dedupe, JSON-encoding the
    // metadata text column, and swallowing insert failures so a notification
    // error can't appear to roll back the already-committed resolution.
    await writeContestNotifications({
      contestId,
      parentSubmissionId: outcome.parent.id,
      challengerSubmissionId: outcome.challenger.id,
      parentUserId: outcome.parent.userId,
      challengerUserId: outcome.challenger.userId,
      eventId: outcome.parent.eventId,
      action: 'resolve',
      resolution,
      reason,
    })

    return ctx.json({
      success: true,
      data: {
        resolution,
        parent: outcome.parent,
        challenger: outcome.challenger,
        eventPriceUpdated: outcome.eventPriceUpdated,
      },
    })
  },
)

const deferParamsSchema = z.object({
  contestId: z.string().uuid(),
})

const deferBodySchema = z.object({
  reason: z.string().min(10).max(2000),
})

// POST /v1/admin/contests/prices/:contestId/defer — "Need more info"
// engagement signal.
//
// Spec §4.5, §6.4. The contestId path param is the PARENT submission id
// (consistent with the list, detail, and resolve endpoints).
//
// Unlike resolve, defer changes NO statuses. The counter stays `pending`, the
// parent stays `disputed` (or `corroborated` — see below), and the events
// projection is untouched. The single state mutation is on the counter row:
// `lastAdminActionKind = 'defer'`, `lastAdminActionAt = NOW()`. That's the
// surface the consumer event-detail page reads to render the quiet pill on
// the counter card per §4.5; without these columns set, the defer is
// invisible to consumers.
//
// The handler runs inside a transaction with SELECT FOR UPDATE on parent +
// counter even though only one row is mutated. This prevents races with a
// concurrent resolve: if another admin resolved the contest between the
// dropdown click and the confirm, we surface a 409 precondition_failed rather
// than silently writing engagement-signal fields onto a row that's already
// archived.
//
// Same-slot assertions (event_id / tier / source_category) are kept for
// defense-in-depth — by §4.6 + Task 5b they should never fire, but the cost
// is one comparison per request and the failure mode (defer signals on a
// mismatched slot) would be invisible to consumers.
//
// Audit + notification writes happen OUTSIDE the transaction (after commit),
// same pattern as resolve. Notifications are fanned out via
// writeContestNotifications in apps/api/src/lib/contest-notifications.ts.
contestsAdminRouter.post(
  '/prices/:contestId/defer',
  zValidator('param', deferParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400)
    }
  }),
  zValidator('json', deferBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      )
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param')
    const { reason } = ctx.req.valid('json')
    const admin = getAuthUser(ctx)

    type DeferOutcome =
      | {
          ok: 'committed'
          parent: typeof priceSubmissions.$inferSelect
          counter: typeof priceSubmissions.$inferSelect
          deferredAt: Date
        }
      | { ok: 'not_found' }
      | { ok: 'precondition_failed'; reason: string }

    const outcome: DeferOutcome = await db.transaction(async (tx) => {
      // Lock the parent row first.
      const [parent] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, contestId))
        .limit(1)
        .for('update')
      if (!parent) return { ok: 'not_found' }

      // Lock the single pending counter (§4.6 partial unique index).
      const [counter] = await tx
        .select()
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, contestId),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
        .limit(1)
        .for('update')
      if (!counter) {
        return {
          ok: 'precondition_failed',
          reason: 'No pending counter exists for this contest.',
        }
      }

      // Sanity gates — symmetric with the resolve handler so a defer can't
      // silently land on a mismatched slot. The parent.disputedSubmissionId
      // null check confirms the caller passed a parent id (not a counter id).
      if (parent.disputedSubmissionId !== null) {
        return {
          ok: 'precondition_failed',
          reason: 'Target row is a counter, not a parent.',
        }
      }
      if (parent.eventId !== counter.eventId) {
        return {
          ok: 'precondition_failed',
          reason: 'Parent and challenger belong to different events.',
        }
      }
      if (parent.tier !== counter.tier) {
        return {
          ok: 'precondition_failed',
          reason: `Parent tier ${parent.tier} does not match challenger tier ${counter.tier}.`,
        }
      }
      // Treat NULL source_category as "matches anything." See the resolve
      // handler above for the full rationale — legacy parents have
      // sourceCategory=null and counters derive a non-null value, so a
      // strict `!==` check would permanently block defer on legacy contests.
      if (
        parent.sourceCategory !== null &&
        counter.sourceCategory !== null &&
        parent.sourceCategory !== counter.sourceCategory
      ) {
        return {
          ok: 'precondition_failed',
          reason: `Parent source_category ${parent.sourceCategory} does not match challenger source_category ${counter.sourceCategory}.`,
        }
      }

      // Single UPDATE — engagement-signal fields on the counter. Status
      // intentionally untouched. RETURNING captures the server-side NOW() for
      // the response body (so the client doesn't have to re-fetch to surface
      // the timestamp).
      const [updated] = await tx
        .update(priceSubmissions)
        .set({
          lastAdminActionKind: 'defer',
          lastAdminActionAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, counter.id))
        .returning()
      if (!updated) {
        throw new Error(
          'Post-defer read failed — counter row missing after update.',
        )
      }
      const deferredAt = updated.lastAdminActionAt
      if (!deferredAt) {
        throw new Error(
          'Post-defer read returned null lastAdminActionAt — expected timestamp.',
        )
      }

      return {
        ok: 'committed',
        parent,
        counter: updated,
        deferredAt,
      }
    })

    if (outcome.ok === 'not_found') {
      return ctx.json({ success: false, error: 'Contest not found' }, 404)
    }
    if (outcome.ok === 'precondition_failed') {
      return ctx.json(
        {
          success: false,
          error: outcome.reason,
          code: 'precondition_failed',
        },
        409,
      )
    }

    // Audit middleware reads these from context after the response is built.
    // Same pattern as resolve. Failures inside the middleware are swallowed
    // there; the defer signal is already committed.
    ctx.set('auditActorId', admin.userId)
    ctx.set('auditAction', 'contest.defer')
    ctx.set('auditTargetId', contestId)
    ctx.set('auditMeta', {
      parentId: outcome.parent.id,
      challengerId: outcome.counter.id,
      eventId: outcome.parent.eventId,
      reason,
    })

    // Notification fan-out lives in apps/api/src/lib/contest-notifications.ts
    // (extracted in Task 10). The helper handles dedupe, JSON-encoding the
    // metadata text column (defer metadata includes kind:'defer' and a
    // denormalized reason for consumer surfacing per #737), and swallowing
    // insert failures so a notification error can't appear to roll back the
    // already-committed defer signal.
    await writeContestNotifications({
      contestId,
      parentSubmissionId: outcome.parent.id,
      challengerSubmissionId: outcome.counter.id,
      parentUserId: outcome.parent.userId,
      challengerUserId: outcome.counter.userId,
      eventId: outcome.parent.eventId,
      action: 'defer',
      reason,
    })

    return ctx.json({
      success: true,
      data: {
        contestId: outcome.parent.id,
        deferredAt: outcome.deferredAt.toISOString(),
        deferReason: reason,
      },
    })
  },
)
