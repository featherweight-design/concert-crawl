import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
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

    if (venueId !== undefined) {
      // Prepend any in-progress run for this specific venue
      const inProgressForVenue = [...inProgressCrawls.entries()]
        .filter(([, val]) => val.venueId === venueId)
        .map(([runId, val]) => ({
          id: runId,
          venueId: val.venueId,
          venueName: null as string | null,
          status: 'in_progress' as const,
          httpStatusCode: null,
          robotsTxtBlocked: null,
          extractionStrategyUsed: null,
          eventsFound: 0,
          eventsInserted: 0,
          errorMessage: null,
          durationMs: null,
          createdAt: val.startedAt,
        }))

      return ctx.json({
        success: true,
        data: [...inProgressForVenue, ...dbRuns],
      })
    }

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

  // Build once, look up O(1) per venue
  const inProgressByVenueId = new Map(
    [...inProgressCrawls.entries()]
      .filter(([, val]) => val.venueId !== undefined)
      .map(([runId, val]) => [
        val.venueId,
        { runId, startedAt: val.startedAt },
      ]),
  )

  const data = venueList.map((venue) => {
    const lastRun = runsByVenueId.get(venue.id) ?? null
    const inProgressEntry = inProgressByVenueId.get(venue.id)
    const effectiveLastRun = inProgressEntry
      ? {
          id: inProgressEntry.runId,
          venueId: venue.id,
          status: 'in_progress' as const,
          createdAt: inProgressEntry.startedAt,
          eventsFound: 0,
          eventsInserted: 0,
          errorMessage: null,
          extractionStrategyUsed: null,
        }
      : lastRun

    return { ...venue, lastRun: effectiveLastRun }
  })

  return ctx.json({ success: true, data })
})
