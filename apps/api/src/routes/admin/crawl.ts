import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, asc, inArray } from 'drizzle-orm'
import { db, venues, crawlRuns, crawlTriggers } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const venueIdSchema = z.object({
  venueId: z.string().uuid('venueId must be a UUID'),
})
const crawlRunIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })
const triggerIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })

export const crawlAdminRouter = new Hono<AdminVariables>()

// POST /v1/admin/crawl/:venueId — queue a crawl trigger (handled by crawler service)
crawlAdminRouter.post(
  '/:venueId',
  zValidator('param', venueIdSchema),
  async (ctx) => {
    const { venueId } = ctx.req.valid('param')

    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId))

    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    if (!venue.active || !venue.verified) {
      return ctx.json(
        { success: false, error: 'Venue must be active and verified to crawl' },
        400,
      )
    }

    const inserted = await db
      .insert(crawlTriggers)
      .values({ venueId, triggeredBy: getAuthUser(ctx).userId })
      .returning()

    const trigger = inserted[0]
    if (!trigger) {
      return ctx.json(
        { success: false, error: 'Failed to create crawl trigger' },
        500,
      )
    }

    ctx.set('auditAction', 'crawl.trigger')
    ctx.set('auditTargetId', venueId)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: { triggerId: trigger.id } }, 202)
  },
)

// GET /v1/admin/crawl/triggers/:id — poll a single trigger by ID
crawlAdminRouter.get(
  '/triggers/:id',
  zValidator('param', triggerIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const [trigger] = await db
      .select()
      .from(crawlTriggers)
      .where(eq(crawlTriggers.id, id))
    if (!trigger) {
      return ctx.json({ success: false, error: 'Trigger not found' }, 404)
    }
    return ctx.json({ success: true, data: trigger })
  },
)

// GET /v1/admin/crawl/runs/:id — poll a single crawl run by ID
crawlAdminRouter.get(
  '/runs/:id',
  zValidator('param', crawlRunIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [crawlRun] = await db
      .select()
      .from(crawlRuns)
      .where(eq(crawlRuns.id, id))

    if (!crawlRun) {
      return ctx.json({ success: false, error: 'Crawl run not found' }, 404)
    }

    return ctx.json({ success: true, data: crawlRun })
  },
)

// GET /v1/admin/crawl/runs?venueId=:id&limit=10 — list crawl runs (optionally filtered by venue)
const listQuerySchema = z.object({
  venueId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

crawlAdminRouter.get(
  '/runs',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { venueId, limit } = ctx.req.valid('query')

    const dbRuns = await db
      .select({
        id: crawlRuns.id,
        venueId: crawlRuns.venueId,
        venueName: venues.name,
        status: crawlRuns.status,
        httpStatusCode: crawlRuns.httpStatusCode,
        robotsTxtBlocked: crawlRuns.robotsTxtBlocked,
        extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
        eventsFound: crawlRuns.eventsFound,
        eventsInserted: crawlRuns.eventsInserted,
        errorMessage: crawlRuns.errorMessage,
        durationMs: crawlRuns.durationMs,
        createdAt: crawlRuns.createdAt,
      })
      .from(crawlRuns)
      .leftJoin(venues, eq(crawlRuns.venueId, venues.id))
      .where(venueId !== undefined ? eq(crawlRuns.venueId, venueId) : undefined)
      .orderBy(desc(crawlRuns.createdAt))
      .limit(limit)

    return ctx.json({ success: true, data: dbRuns })
  },
)

// GET /v1/admin/crawl/status — all venues with their most recent crawl run
crawlAdminRouter.get('/status', async (ctx) => {
  const venueList = await db
    .select({
      id: venues.id,
      name: venues.name,
      active: venues.active,
      verified: venues.verified,
      consecutiveFailures: venues.consecutiveFailures,
      blockedAt: venues.blockedAt,
      lastCrawledAt: venues.lastCrawledAt,
    })
    .from(venues)
    .orderBy(asc(venues.name))

  const venueIds = venueList.map((venue) => venue.id)

  const latestRuns =
    venueIds.length > 0
      ? await db
          .selectDistinctOn([crawlRuns.venueId], {
            id: crawlRuns.id,
            venueId: crawlRuns.venueId,
            status: crawlRuns.status,
            createdAt: crawlRuns.createdAt,
            eventsFound: crawlRuns.eventsFound,
            eventsInserted: crawlRuns.eventsInserted,
            errorMessage: crawlRuns.errorMessage,
            extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
          })
          .from(crawlRuns)
          .where(inArray(crawlRuns.venueId, venueIds))
          .orderBy(crawlRuns.venueId, desc(crawlRuns.createdAt))
      : []

  const runsByVenueId = new Map(latestRuns.map((run) => [run.venueId, run]))

  const data = venueList.map((venue) => {
    const lastRun = runsByVenueId.get(venue.id) ?? null
    return { ...venue, lastRun }
  })

  return ctx.json({ success: true, data })
})
