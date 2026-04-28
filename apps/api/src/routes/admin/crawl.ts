import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { db, venues, crawlRuns } from '@concert-crawl/db'
import { crawlVenue } from '@concert-crawl/crawler-core'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

// Tracks crawl runs that have been started but not yet written to DB.
// Keyed by crawl_run_id. Entries are removed when crawlVenue resolves/rejects.
// TODO: This map is process-local. A server restart mid-crawl will cause the
// in-progress run to disappear, making the poll endpoint return 404. Fix before
// horizontal scaling (multiple API instances) is needed.
const inProgressCrawls = new Map<
  string,
  { venueId: string; startedAt: string }
>()

const venueIdSchema = z.object({
  venueId: z.string().uuid('venueId must be a UUID'),
})
const crawlRunIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })

export const crawlAdminRouter = new Hono<AdminVariables>()

// POST /v1/admin/crawl/:venueId — trigger an async crawl
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

    const crawlRunId = crypto.randomUUID()
    inProgressCrawls.set(crawlRunId, {
      venueId,
      startedAt: new Date().toISOString(),
    })

    void (async () => {
      try {
        await crawlVenue(venueId, crawlRunId)
      } catch (err) {
        console.error(
          JSON.stringify({
            event: 'crawl.trigger.error',
            crawlRunId,
            venueId,
            error: String(err),
          }),
        )
      } finally {
        inProgressCrawls.delete(crawlRunId)
      }
    })()

    ctx.set('auditAction', 'crawl.trigger')
    ctx.set('auditTargetId', venueId)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: { crawlRunId } }, 202)
  },
)

// GET /v1/admin/crawl/runs/:id — poll a single crawl run by ID
crawlAdminRouter.get(
  '/runs/:id',
  zValidator('param', crawlRunIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    // Check in-memory first — the DB row won't exist until the crawl finishes
    const inProgress = inProgressCrawls.get(id)
    if (inProgress) {
      return ctx.json({
        success: true,
        data: {
          id,
          venueId: inProgress.venueId,
          status: 'in_progress',
          httpStatusCode: null,
          robotsTxtBlocked: null,
          extractionStrategyUsed: null,
          eventsFound: 0,
          eventsInserted: 0,
          errorMessage: null,
          durationMs: null,
          createdAt: inProgress.startedAt,
        },
      })
    }

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

// GET /v1/admin/crawl/runs?venueId=:id&limit=10 — list crawl runs for a venue
const listQuerySchema = z.object({
  venueId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

crawlAdminRouter.get(
  '/runs',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { venueId, limit } = ctx.req.valid('query')

    const runs = await db
      .select()
      .from(crawlRuns)
      .where(and(eq(crawlRuns.venueId, venueId)))
      .orderBy(desc(crawlRuns.createdAt))
      .limit(limit)

    return ctx.json({ success: true, data: runs })
  },
)
