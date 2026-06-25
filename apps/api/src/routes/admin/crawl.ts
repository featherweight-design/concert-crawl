import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, desc, asc, inArray, isNull } from 'drizzle-orm'
import {
  db,
  venues,
  crawlRuns,
  crawlTriggers,
  notifications,
} from '@concert-crawl/db'
import type { ActiveCrawlAlert } from '@concert-crawl/types'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const venueIdSchema = z.object({
  venueId: z.string().uuid('venueId must be a UUID'),
})
const crawlRunIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })
const triggerIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })

// Subset of notification.metadata shape this route cares about (#804).
// Validated via Zod so a malformed metadata field doesn't poison the badge
// query — invalid rows just fall through to "no alert" instead of throwing.
const alertMetadataSchema = z.object({
  crawlRunId: z.string().uuid().optional(),
})

// Cap the unread-notification scan. The list endpoint defaults to 10 runs
// per page; surfacing alerts for those rows never needs more than a few
// hundred unread notifications. Without this cap a growing unread inbox
// would slow down every admin Crawl History page view.
const ACTIVE_ALERT_SCAN_LIMIT = 500

function parseAlertMetadata(
  raw: string | null,
): z.infer<typeof alertMetadataSchema> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = alertMetadataSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const crawlAdminRouter = new Hono<AdminVariables>()

// POST /v1/admin/crawl — queue crawl triggers for all active + verified venues
crawlAdminRouter.post('/', async (ctx) => {
  const activeVenues = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.active, true), eq(venues.verified, true)))

  if (activeVenues.length === 0) {
    return ctx.json({ success: true, data: { triggerIds: [], count: 0 } }, 202)
  }

  const actor = getAuthUser(ctx).userId
  const inserted = await db
    .insert(crawlTriggers)
    .values(
      activeVenues.map((venue) => ({ venueId: venue.id, triggeredBy: actor })),
    )
    .returning({ id: crawlTriggers.id, venueId: crawlTriggers.venueId })

  ctx.set('auditAction', 'crawl.trigger_all')
  ctx.set('auditActorId', actor)

  return ctx.json(
    {
      success: true,
      data: {
        triggerIds: inserted.map((row) => row.id),
        count: inserted.length,
      },
    },
    202,
  )
})

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

// GET /v1/admin/crawl/runs?venueId=:id&limit=10&hasAlert=true — list crawl
// runs (optionally filtered by venue and/or to only those with an active
// admin_alert pointing at them). hasAlert is the surface that satisfies
// #804's "find suspicious runs quickly" workflow without forcing operators
// to scan the full list.
const listQuerySchema = z.object({
  venueId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  hasAlert: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
})

crawlAdminRouter.get(
  '/runs',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { venueId, limit, hasAlert } = ctx.req.valid('query')

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
        eventsUpdated: crawlRuns.eventsUpdated,
        errorMessage: crawlRuns.errorMessage,
        durationMs: crawlRuns.durationMs,
        llmCostUsd: crawlRuns.llmCostUsd,
        createdAt: crawlRuns.createdAt,
      })
      .from(crawlRuns)
      .leftJoin(venues, eq(crawlRuns.venueId, venues.id))
      .where(venueId !== undefined ? eq(crawlRuns.venueId, venueId) : undefined)
      .orderBy(desc(crawlRuns.createdAt))
      .limit(limit)

    // Surface unread alerts that belong to any returned crawl run (#804).
    // Notification → crawl_run linkage lives in metadata.crawlRunId (a JSON
    // string column), so the cheapest correct join is to fetch the small
    // candidate set in JS and group by id. We scope to the two categories
    // a crawl row would surface (`crawl.event_count_dropped` for went-dark/
    // sharp-drop, `crawl.failed` for the consecutive-failure path) and only
    // pull unread ones — once an operator marks the notification read, the
    // badge clears.
    const alertsByRunId = new Map<string, ActiveCrawlAlert>()
    if (dbRuns.length > 0) {
      // Set lookup keeps the inner check O(1) regardless of how many
      // candidate alerts come back from the notifications scan.
      const runIdSet = new Set(dbRuns.map((run) => run.id))
      const rawAlerts = await db
        .select({
          id: notifications.id,
          category: notifications.category,
          metadata: notifications.metadata,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, 'admin_alert'),
            inArray(notifications.category, [
              'crawl.event_count_dropped',
              'crawl.failed',
            ]),
            isNull(notifications.readAt),
          ),
        )
        // Newest-first + bounded scan. Without explicit ordering the
        // "first match wins" tie-break below would be non-deterministic;
        // newest-first is also the intuitive choice (most recent alert
        // is the operator's likely concern).
        .orderBy(desc(notifications.createdAt))
        .limit(ACTIVE_ALERT_SCAN_LIMIT)
      // Defensive guard: anything other than a row array (unexpected DB
      // driver state, a test mock that didn't override this path) collapses
      // to "no alerts" rather than throwing and 500-ing the whole list.
      const candidateAlerts = Array.isArray(rawAlerts) ? rawAlerts : []

      for (const alert of candidateAlerts) {
        const meta = parseAlertMetadata(alert.metadata)
        if (!meta?.crawlRunId) continue
        if (!runIdSet.has(meta.crawlRunId)) continue
        const category = alert.category as ActiveCrawlAlert['category']
        // First match wins; multiple unread alerts on the same row would be
        // unusual and the operator's clearing one is enough to retest.
        if (!alertsByRunId.has(meta.crawlRunId)) {
          alertsByRunId.set(meta.crawlRunId, {
            notificationId: alert.id,
            category,
          })
        }
      }
    }

    const annotated = dbRuns.map((run) => ({
      ...run,
      activeAlert: alertsByRunId.get(run.id) ?? null,
    }))

    // hasAlert=true narrows the list to suspicious runs only — the
    // "find quickly" workflow from #804. We do this in JS rather than
    // SQL so the same notifications scan answers both questions
    // (which rows have alerts + what those alerts are) without a
    // second join.
    const data = hasAlert
      ? annotated.filter((run) => run.activeAlert !== null)
      : annotated

    return ctx.json({ success: true, data })
  },
)

// GET /v1/admin/crawl/status — all venues with their most recent crawl run
crawlAdminRouter.get('/status', async (ctx) => {
  const venueList = await db
    .select({
      id: venues.id,
      name: venues.name,
      websiteUrl: venues.websiteUrl,
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
            httpStatusCode: crawlRuns.httpStatusCode,
            createdAt: crawlRuns.createdAt,
            eventsFound: crawlRuns.eventsFound,
            eventsInserted: crawlRuns.eventsInserted,
            eventsUpdated: crawlRuns.eventsUpdated,
            errorMessage: crawlRuns.errorMessage,
            extractionStrategyUsed: crawlRuns.extractionStrategyUsed,
            durationMs: crawlRuns.durationMs,
            llmCostUsd: crawlRuns.llmCostUsd,
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
