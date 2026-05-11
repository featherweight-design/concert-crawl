import { Hono } from 'hono'
import { and, count, desc, eq, max, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
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
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:prices')

export const pricesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/prices/events — upcoming events with current price data + last retrieval info
pricesAdminRouter.get('/events', async (ctx) => {
  const rows = await db
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
      lastRetrievedAt: sql<string | null>`(
        SELECT MAX(attempted_at) FROM price_retrieval_log
        WHERE event_id = ${events.id}
      )`,
      lastOutcome: sql<string | null>`(
        SELECT outcome FROM price_retrieval_log
        WHERE event_id = ${events.id}
        ORDER BY attempted_at DESC
        LIMIT 1
      )`,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.status, 'upcoming'))
    .orderBy(desc(events.date))
    .limit(100)

  return ctx.json({ success: true, data: rows } as const)
})

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
  const autoFlagged = stats.filter(
    (stat) =>
      Number(stat.hitCount) === 0 &&
      stat.lastAttemptedAt != null &&
      new Date(stat.lastAttemptedAt) < thirtyDaysAgo,
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
pricesAdminRouter.get('/coverage', async (ctx) => {
  const [total] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.status, 'upcoming'))

  const [withPrice] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        sql`${events.ticketPriceMin} IS NOT NULL`,
      ),
    )

  const totalCount = total?.count ?? 0
  const pricedCount = withPrice?.count ?? 0
  const pct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0

  return ctx.json({
    success: true,
    data: { total: totalCount, withPrice: pricedCount, pct },
  })
})

// GET /v1/admin/prices/submissions — community submission queue
pricesAdminRouter.get('/submissions', async (ctx) => {
  const rows = await db
    .select()
    .from(priceSubmissions)
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(50)

  return ctx.json({ success: true, data: rows })
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

    const [existing] = await db
      .select({ userId: priceSubmissions.userId, status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)

    if (!existing)
      return ctx.json({ success: false, error: 'Submission not found' }, 404)

    const [updated] = await db
      .update(priceSubmissions)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(priceSubmissions.id, id))
      .returning()

    if (!updated)
      return ctx.json({ success: false, error: 'Submission not found' }, 404)

    if (
      status === 'corroborated' &&
      existing.status !== 'corroborated' &&
      existing.userId !== null
    ) {
      await db
        .update(userRoles)
        .set({ priceCredScore: sql`${userRoles.priceCredScore} + 1` })
        .where(eq(userRoles.userId, existing.userId))
    }

    ctx.set('auditActorId', getAuthUser(ctx).userId)
    ctx.set('auditAction', 'price.submission.update')
    ctx.set('auditTargetId', id)

    return ctx.json({ success: true, data: updated })
  },
)

// GET /v1/admin/prices/activity — last 50 price retrieval attempts with event + venue context
pricesAdminRouter.get('/activity', async (ctx) => {
  const rows = await db
    .select({
      eventId: priceRetrievalLog.eventId,
      eventTitle: events.title,
      venueName: venues.name,
      date: events.date,
      outcome: priceRetrievalLog.outcome,
      updatedAt: priceRetrievalLog.attemptedAt,
    })
    .from(priceRetrievalLog)
    .leftJoin(events, eq(priceRetrievalLog.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .orderBy(desc(priceRetrievalLog.attemptedAt))
    .limit(50)

  return ctx.json({ success: true, data: rows })
})

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
