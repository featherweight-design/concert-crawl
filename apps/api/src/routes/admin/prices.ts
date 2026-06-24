import { Hono } from 'hono'
import { and, asc, count, desc, eq, gte, isNull, max, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import * as Sentry from '@sentry/hono/node'
import {
  db,
  events,
  priceRetrievalLog,
  priceSubmissions,
  userRoles,
  venues,
} from '@concert-crawl/db'
import { runPricePipeline } from '@concert-crawl/price-pipeline'
import { createLogger } from '@concert-crawl/logger'
import { deriveSourceCategory } from '@concert-crawl/types'
import { getAuthUser } from '../../middleware/auth.js'
import { apiLogger } from '../../lib/logger.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:prices')

export const pricesAdminRouter = new Hono<AdminVariables>()

const eventsQuerySchema = z.object({
  missingOnly: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  // Opt-in count flag for the new pagination component. See events.ts for
  // the same pattern. Without count=true the response is the legacy array.
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /v1/admin/prices/events — upcoming events with current price data + last retrieval info
pricesAdminRouter.get(
  '/events',
  zValidator('query', eventsQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422)
    }
  }),
  async (ctx) => {
    const { missingOnly, count, limit, offset } = ctx.req.valid('query')
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })

    // Exclude admin-hidden non-concerts (#732, same pattern as #712 on the
    // Missing tab). Events flagged hidden_from_consumer=true have already
    // been triaged as non-concerts — they shouldn't appear in the missing-
    // price queue or skew the coverage %.
    const conditions = [
      eq(events.status, 'upcoming'),
      gte(events.date, today),
      eq(events.hiddenFromConsumer, false),
      ...(missingOnly ? [isNull(events.ticketPriceMin)] : []),
    ]
    const whereClause = and(...conditions)

    // Use a single aggregating join instead of two correlated subqueries per row.
    // The subquery groups price_retrieval_log by event_id once, then LEFT JOINs in.
    const latestLog = db
      .select({
        eventId: priceRetrievalLog.eventId,
        lastRetrievedAt: max(priceRetrievalLog.attemptedAt).as(
          'last_retrieved_at',
        ),
        lastOutcome: sql<string | null>`(
          array_agg(${priceRetrievalLog.outcome} ORDER BY ${priceRetrievalLog.attemptedAt} DESC)
        )[1]`.as('last_outcome'),
      })
      .from(priceRetrievalLog)
      .groupBy(priceRetrievalLog.eventId)
      .as('latest_log')

    const rowsPromise = db
      .select({
        eventId: events.id,
        eventTitle: events.title,
        artist: events.artist,
        venueName: venues.name,
        date: events.date,
        ticketUrl: events.ticketUrl,
        priceMin: events.ticketPriceMin,
        priceMax: events.ticketPriceMax,
        priceSource: events.priceSource,
        lastRetrievedAt: latestLog.lastRetrievedAt,
        lastOutcome: latestLog.lastOutcome,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(latestLog, eq(latestLog.eventId, events.id))
      .where(whereClause)
      .orderBy(asc(events.date), asc(events.id))
      .limit(limit)
      .offset(offset)

    if (!count) {
      const rows = await rowsPromise
      return ctx.json({ success: true, data: rows } as const)
    }

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(whereClause)
    const [rows, countResult] = await Promise.all([rowsPromise, countQuery])
    const total = countResult[0]?.total ?? 0
    return ctx.json({ success: true, data: { rows, total } } as const)
  },
)

// GET /v1/admin/prices/health — per-source × per-venue success rates
pricesAdminRouter.get('/health', async (ctx) => {
  const stats = await db
    .select({
      venueId: priceRetrievalLog.venueId,
      source: priceRetrievalLog.source,
      totalCount: count(),
      hitCount: count(
        sql`CASE WHEN ${priceRetrievalLog.outcome} = 'hit' THEN 1 END`,
      ),
      lastAttemptedAt: max(priceRetrievalLog.attemptedAt),
    })
    .from(priceRetrievalLog)
    .groupBy(priceRetrievalLog.venueId, priceRetrievalLog.source)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  // "0 hits in 30 days": tried recently but never succeeded
  const autoFlagged = stats.filter(
    (stat) =>
      Number(stat.hitCount) === 0 &&
      stat.lastAttemptedAt != null &&
      new Date(stat.lastAttemptedAt) >= thirtyDaysAgo,
  )

  return ctx.json({ success: true, data: { stats, autoFlagged } })
})

// GET /v1/admin/prices/log — last 100 retrieval attempts
pricesAdminRouter.get('/log', async (ctx) => {
  const rows = await db
    .select()
    .from(priceRetrievalLog)
    .orderBy(desc(priceRetrievalLog.attemptedAt))
    .limit(100)

  return ctx.json({ success: true, data: rows })
})

// GET /v1/admin/prices/coverage — % of upcoming events with price data
//
// Mirrors the /v1/admin/prices/events filter set so the % is a faithful
// summary of the queue admins actually work from:
//   - status='upcoming'                 (lifecycle state)
//   - date >= today                     (the /events surface also enforces
//                                        this; status='upcoming' alone is
//                                        insufficient since stale rows can
//                                        keep the status)
//   - hidden_from_consumer=false        (#732 — admin-triaged non-concerts
//                                        don't need prices)
//
// `::int` cast matches the rest of this file's count(*) results so JSON
// numbers are stable integers, not bigint strings via drizzle's `count()`.
pricesAdminRouter.get('/coverage', async (ctx) => {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Denver',
  })

  const baseConditions = and(
    eq(events.status, 'upcoming'),
    gte(events.date, today),
    eq(events.hiddenFromConsumer, false),
  )

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(baseConditions)

  const [withPrice] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(baseConditions, sql`${events.ticketPriceMin} IS NOT NULL`))

  const totalCount = total?.count ?? 0
  const pricedCount = withPrice?.count ?? 0
  const pct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0

  return ctx.json({
    success: true,
    data: { total: totalCount, withPrice: pricedCount, pct },
  })
})

// GET /v1/admin/prices/submissions — community submission queue
// `count=true` switches to `{ rows, total }` for the new pagination component.
//
// Defaults to `status=pending` so the moderation queue contains only items
// that still need an admin decision — corroborated/disputed/stale items have
// already been processed and don't belong on this surface (#708). The pill
// on /admin/review uses the same status='pending' filter, so the two surfaces
// stay in lock-step. Pass `?status=all` to opt out of the default pending
// filter for audit views (returns corroborated + archived + stale rows in
// addition to pending).
//
// NOTE: contest counter rows (`disputed_submission_id IS NOT NULL`) are
// ALWAYS excluded here — including when status=all — because they're owned
// by the contest endpoints (GET /v1/admin/contests/prices). The PATCH
// lockout (#754) + the partial unique index keep contest rows on a
// separate path from the regular single-submission lifecycle, so audit
// callers needing contest visibility must use the contests endpoint.
const submissionsQuerySchema = z.object({
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  status: z.enum(['pending', 'all']).optional().default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

pricesAdminRouter.get(
  '/submissions',
  zValidator('query', submissionsQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422)
    }
  }),
  async (ctx) => {
    const { count, status, limit, offset } = ctx.req.valid('query')

    // Exclude contest counter rows (`disputed_submission_id IS NOT NULL`)
    // from the legacy submissions queue. Counters are adjudicated through
    // /v1/admin/contests/prices and the PATCH lockout (#754) returns 409
    // if an admin tries to action one from this surface — so leaving them
    // visible here was both un-actionable AND double-counts the pending
    // pill (matched in /v1/admin/review/counts → `prices`). The list
    // endpoint and the counts query stay in lock-step with this filter.
    const statusClause =
      status === 'pending' ? eq(priceSubmissions.status, 'pending') : undefined
    const whereClause = and(
      statusClause,
      isNull(priceSubmissions.disputedSubmissionId),
    )

    const rowsPromise = db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        userId: priceSubmissions.userId,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        status: priceSubmissions.status,
        // Always null in the filtered result (we excluded contest rows
        // above), but surfaced on the wire so any future UI can know which
        // rows are contests without re-querying.
        disputedSubmissionId: priceSubmissions.disputedSubmissionId,
        createdAt: priceSubmissions.createdAt,
        eventTitle: events.title,
        eventDate: events.date,
        ticketUrl: events.ticketUrl,
        venueName: venues.name,
      })
      .from(priceSubmissions)
      .leftJoin(events, eq(priceSubmissions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(whereClause)
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(limit)
      .offset(offset)

    if (!count) {
      const rows = await rowsPromise
      return ctx.json({ success: true, data: rows })
    }

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(whereClause)
    const [rows, countResult] = await Promise.all([rowsPromise, countQuery])
    const total = countResult[0]?.total ?? 0
    return ctx.json({ success: true, data: { rows, total } })
  },
)

// GET /v1/admin/prices/submissions/count — pending submissions count for dashboard
pricesAdminRouter.get('/submissions/count', async (ctx) => {
  const [result] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.status, 'pending'))
  return ctx.json({ success: true, data: { pending: result?.pending ?? 0 } })
})

const patchSubmissionSchema = z.object({
  status: z.enum(['corroborated', 'disputed', 'stale']),
})

// PATCH /v1/admin/prices/submissions/:id — approve (corroborated), dispute, or stale
pricesAdminRouter.patch(
  '/submissions/:id',
  zValidator('json', patchSubmissionSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid status' }, 422)
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.param()
    const { status } = ctx.req.valid('json')

    type TxResult =
      | { ok: true; updated: typeof priceSubmissions.$inferSelect }
      | { ok: false }
      | { ok: 'contest_lockout' }

    const result: TxResult = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          userId: priceSubmissions.userId,
          status: priceSubmissions.status,
          eventId: priceSubmissions.eventId,
          priceMin: priceSubmissions.priceMin,
          priceMax: priceSubmissions.priceMax,
          disputedSubmissionId: priceSubmissions.disputedSubmissionId,
        })
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, id))
        .limit(1)
        .for('update')

      if (!existing) return { ok: false }

      // Defensive lockout: contests must resolve through the dedicated
      // /v1/admin/contests/prices/:contestId endpoint so the parent + counter
      // are adjudicated atomically with audit + cred + event projection. This
      // pre-contest-UI endpoint can silently overturn a corroborated price if
      // an admin approves a counter row from the flat queue — block it at the
      // gate, before any update is applied. Spec §4.7 + §11.3.
      if (
        existing.disputedSubmissionId !== null ||
        existing.status === 'disputed'
      ) {
        return { ok: 'contest_lockout' as const }
      }

      // R2-2 — defense in depth. Both counter-creation routes flip the
      // parent to status='disputed' in the same transaction that inserts
      // the counter (Tasks 5 + 5b), so in steady state the previous check
      // is sufficient. But a parent could still be in status='corroborated'
      // with a pending counter against it under three scenarios:
      //   (a) migration-window orphan rows that pre-date the flip logic,
      //   (b) the narrow window inside the resolve transaction between
      //       counter INSERT and parent UPDATE,
      //   (c) any future codepath that creates a counter without flipping
      //       the parent (would be a bug, but the lockout costs us nothing).
      // In any of these cases, mutating the parent here would race the
      // resolve flow's `parent.status IN ('corroborated', 'disputed')`
      // sanity gate. Placed AFTER the existing two checks so the more
      // specific lockout reasons (counter row, disputed parent) fire
      // first.
      const [pendingCounterCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, id),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
      if ((pendingCounterCount?.count ?? 0) > 0) {
        return { ok: 'contest_lockout' as const }
      }

      const [updated] = await tx
        .update(priceSubmissions)
        .set({ status, updatedAt: sql`now()` })
        .where(eq(priceSubmissions.id, id))
        .returning()

      if (!updated) return { ok: false }

      if (status === 'corroborated' && existing.status !== 'corroborated') {
        // Award cred to the submitter
        if (existing.userId !== null) {
          await tx
            .update(userRoles)
            .set({ priceCredScore: sql`${userRoles.priceCredScore} + 1` })
            .where(eq(userRoles.userId, existing.userId))
        }

        // Propagate the approved community price to the event
        await tx
          .update(events)
          .set({
            ticketPriceMin: existing.priceMin,
            ticketPriceMax: existing.priceMax ?? null,
            priceSource: 'community',
          })
          .where(eq(events.id, existing.eventId))
      }

      return { ok: true, updated }
    })

    if (result.ok === 'contest_lockout') {
      apiLogger.warn(
        { submissionId: id },
        'PATCH lockout: contest row reached the non-contest endpoint',
      )
      // `endpoint_lockout: contest_row` is the alert tag (spec §11.3). Baseline
      // volume should be near zero — any firing is real signal that the new
      // contest UI is being bypassed.
      Sentry.captureMessage(
        'Contest row hit PATCH /v1/admin/prices/submissions/:id',
        {
          level: 'warning',
          tags: { endpoint_lockout: 'contest_row' },
          extra: { submissionId: id },
        },
      )
      return ctx.json(
        {
          success: false,
          error:
            'This submission is part of a contest. Resolve via /v1/admin/contests/prices/:contestId instead.',
        },
        409,
      )
    }

    if (!result.ok)
      return ctx.json({ success: false, error: 'Submission not found' }, 404)

    ctx.set('auditActorId', getAuthUser(ctx).userId)
    ctx.set('auditAction', 'price.submission.update')
    ctx.set('auditTargetId', id)

    return ctx.json({ success: true, data: result.updated })
  },
)

// GET /v1/admin/prices/activity — last 100 price retrieval attempts with event + venue context
pricesAdminRouter.get('/activity', async (ctx) => {
  const rows = await db
    .select({
      eventId: priceRetrievalLog.eventId,
      eventTitle: events.title,
      venueName: venues.name,
      date: events.date,
      source: priceRetrievalLog.source,
      outcome: priceRetrievalLog.outcome,
      latencyMs: priceRetrievalLog.latencyMs,
      attemptedAt: priceRetrievalLog.attemptedAt,
    })
    .from(priceRetrievalLog)
    .leftJoin(events, eq(priceRetrievalLog.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .orderBy(asc(events.date), desc(priceRetrievalLog.attemptedAt))
    .limit(100)

  return ctx.json({ success: true, data: rows })
})

const postAdminSubmissionSchema = z.object({
  eventId: z.string().uuid(),
  priceMin: z.string(),
  priceMax: z.string().optional(),
  vendor: z.enum([
    'AXS',
    'Ticketmaster',
    'SeatGeek',
    'DICE',
    'Eventbrite',
    'VenueBoxOffice',
  ]),
  howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
})

// POST /v1/admin/prices/submissions — admin manually enters a price (corroborated, tier GA)
pricesAdminRouter.post(
  '/submissions',
  zValidator('json', postAdminSubmissionSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid submission data' }, 422)
    }
  }),
  async (ctx) => {
    const { eventId, priceMin, priceMax, vendor, howFound } =
      ctx.req.valid('json')
    const adminUser = getAuthUser(ctx)

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    await db.transaction(async (tx) => {
      await tx.insert(priceSubmissions).values({
        eventId,
        userId: adminUser.userId,
        tier: 'GA',
        vendor,
        howFound,
        // Admin-inserted rows need a non-null source_category so the partial
        // unique index covers them. Use the same (vendor, howFound) heuristic
        // as the consumer submit path.
        sourceCategory: deriveSourceCategory(vendor, howFound),
        priceMin,
        priceMax: priceMax ?? null,
        status: 'corroborated',
      })

      await tx
        .update(events)
        .set({
          ticketPriceMin: priceMin,
          ticketPriceMax: priceMax ?? null,
          priceSource: 'community',
        })
        .where(eq(events.id, eventId))
    })

    ctx.set('auditActorId', adminUser.userId)
    ctx.set('auditAction', 'price.submission.admin_add')
    ctx.set('auditTargetId', eventId)

    return ctx.json({ success: true }, 201)
  },
)

// POST /v1/admin/prices/pipeline/:eventId — on-demand price pipeline run
pricesAdminRouter.post('/pipeline/:eventId', async (ctx) => {
  const { eventId } = ctx.req.param()

  const [event] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      artist: events.artist,
      date: events.date,
      ticketUrl: events.ticketUrl,
      venue: { priceUrl: venues.priceUrl },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, eventId))
    .limit(1)

  if (!event) return ctx.json({ success: false, error: 'Event not found' }, 404)
  if (!event.venueId)
    return ctx.json(
      { success: false, error: 'Event has no associated venue' },
      422,
    )

  const narrowedVenueId = event.venueId

  void (async () => {
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: narrowedVenueId,
        artist: event.artist,
        date: event.date,
        priceUrl: event.venue.priceUrl,
        ticketUrl: event.ticketUrl,
      })
    } catch (err) {
      logger.error({ err, eventId }, 'on-demand price pipeline failed')
    }
  })()

  ctx.set('auditActorId', getAuthUser(ctx).userId)
  ctx.set('auditAction', 'price.pipeline.run')
  ctx.set('auditTargetId', eventId)

  return ctx.json(
    { success: true, data: { eventId, message: 'Pipeline started' } },
    202,
  )
})
