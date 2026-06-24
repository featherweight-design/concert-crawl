import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import {
  db,
  events,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db'
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
          userId: row.parentUserId ?? '',
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
          userId: row.counterUserId ?? '',
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
            userId: parentRow.userId ?? '',
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
        },
        counter: {
          id: counterRow.id,
          priceMin: counterRow.priceMin,
          priceMax: counterRow.priceMax,
          vendor: counterRow.vendor,
          submitter: {
            userId: counterRow.userId ?? '',
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
          lastAdminActionAt:
            counterRow.lastAdminActionAt?.toISOString() ?? null,
          lastAdminActionKind: counterRow.lastAdminActionKind ?? null,
        },
        filedAt: counterRow.observedAt.toISOString(),
        history: [],
      },
    })
  },
)
