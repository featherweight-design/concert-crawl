import { Hono } from 'hono'
import { and, count, desc, eq, max, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  events,
  priceRetrievalLog,
  priceSubmissions,
  venues,
} from '@concert-crawl/db'
import { runPricePipeline } from '@concert-crawl/crawler-core'
import { createLogger } from '@concert-crawl/logger'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:prices')

export const pricesAdminRouter = new Hono<AdminVariables>()

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
    (s) =>
      Number(s.hitCount) === 0 &&
      s.lastAttemptedAt != null &&
      new Date(s.lastAttemptedAt) < thirtyDaysAgo,
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

    const [updated] = await db
      .update(priceSubmissions)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(priceSubmissions.id, id))
      .returning()

    if (!updated)
      return ctx.json({ success: false, error: 'Submission not found' }, 404)

    ctx.set('auditActorId', getAuthUser(ctx).userId)
    ctx.set('auditAction', 'price.submission.update')
    ctx.set('auditTargetId', id)

    return ctx.json({ success: true, data: updated })
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

  void (async () => {
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: event.venueId,
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
