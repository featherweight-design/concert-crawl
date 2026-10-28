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
import { createLogger } from '@concert-crawl/logger'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:crawl')

const venueIdSchema = z.object({
  venueId: z.string().uuid('venueId must be a UUID'),
})
const crawlRunIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })
const triggerIdSchema = z.object({ id: z.string().uuid('id must be a UUID') })

// Optional trigger body. Both crawl-trigger endpoints historically take no
// body (the admin UI posts nothing), so we tolerate an empty/absent body and
// default force to false. When force=true the crawler bypasses both hash-skip
// short-circuits and re-extracts + re-upserts every event — used to reprocess
// legacy rows whose listings are unchanged (e.g. backfilling supportingArtists).
const triggerBodySchema = z.object({
  force: z.boolean().optional().default(false),
})

// Parse force from the request body without requiring one. The admin UI (and
// the Next.js proxy routes) POST no body — often with a `Content-Type:
// application/json` header but an empty payload — so an empty body silently
// resolves to force=false. A *non-empty* body that is present but wrong — either
// unparseable JSON or valid JSON that fails the schema (e.g. `{"force":"true"}`)
// — is a caller/proxy bug worth surfacing: we warn (house rule: every catch
// logs) and still default to false rather than 400-ing the trigger.
async function parseForce(ctx: {
  req: { text: () => Promise<string> }
}): Promise<boolean> {
  const body = (await ctx.req.text()).trim()
  if (body === '') return false
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch (err: unknown) {
    logger.warn(
      { err },
      'crawl trigger: malformed JSON body — defaulting force=false',
    )
    return false
  }
  const result = triggerBodySchema.safeParse(raw)
  if (!result.success) {
    logger.warn(
      { issues: result.error.issues },
      'crawl trigger: body failed schema validation — defaulting force=false',
    )
    return false
  }
  return result.data.force
}

// Subset of notification.metadata shape this route cares about (#804).
// Validated via Zod so a malformed metadata field doesn't poison the badge
// query — invalid rows just fall through to "no alert" instead of throwing.
// `severity` is only written for 'crawl.event_count_dropped' notifications;
// older rows predating that field parse as undefined, a row that
// explicitly sets `severity: null` parses as null, and a row that carries
// an UNKNOWN severity value (e.g. a future writer adding a new variant
// before the API code is updated) collapses to undefined via `.catch()`
// rather than dropping the whole notification. All three cases reach the
// consumer below as "no severity", so the UI falls back to a neutral
// "Event drop" label and the badge still surfaces.
//
// `kind` is the equivalent discriminator for 'crawl.event_ceiling_suspected'
// (#1185) and gets the same tolerant treatment for the same reasons.
//
// `coverage` is the equivalent discriminator for 'crawl.url_coverage_gap' and
// gets its own key rather than reusing `severity`, which is already bound to
// the went-dark enum above — a shared key would fail the enum on every
// coverage row and collapse the discriminator to undefined.
const alertMetadataSchema = z.object({
  crawlRunId: z.string().uuid().optional(),
  severity: z.enum(['went_dark', 'dropped_sharply']).nullish().catch(undefined),
  kind: z.enum(['horizon_shrank', 'pinned_count']).nullish().catch(undefined),
  coverage: z.enum(['no_coverage', 'partial_gap']).nullish().catch(undefined),
})

// Cap the unread-notification scan. The list endpoint defaults to 10 runs
// per page; surfacing alerts for those rows never needs more than a few
// hundred unread notifications. Without this cap a growing unread inbox
// would slow down every admin Crawl History page view.
//
// When hasAlert=true the scan is also the WHERE clause for the
// crawl_runs query, so a too-small cap can drop older alerts off the
// end of the scan and make the "Show alerts only" filter look stale.
// We bump the cap in that mode — the cost is amortized because we'd be
// reading the rows anyway to satisfy the filter.
const ACTIVE_ALERT_SCAN_LIMIT_DEFAULT = 500
const ACTIVE_ALERT_SCAN_LIMIT_FILTERED = 5000

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
// that have not blocked us. A blocked venue is re-tried only by a person
// queueing it on its own, the same exclusion the daily pass applies.
crawlAdminRouter.post('/', async (ctx) => {
  const activeVenues = await db
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        eq(venues.active, true),
        eq(venues.verified, true),
        isNull(venues.blockedAt),
        isNull(venues.crawlPausedAt),
      ),
    )

  if (activeVenues.length === 0) {
    return ctx.json({ success: true, data: { triggerIds: [], count: 0 } }, 202)
  }

  const force = await parseForce(ctx)
  const actor = getAuthUser(ctx).userId
  const inserted = await db
    .insert(crawlTriggers)
    .values(
      activeVenues.map((venue) => ({
        venueId: venue.id,
        triggeredBy: actor,
        force,
      })),
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

    const force = await parseForce(ctx)
    const inserted = await db
      .insert(crawlTriggers)
      .values({ venueId, triggeredBy: getAuthUser(ctx).userId, force })
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

    // Scan unread admin_alert notifications first. When hasAlert=true
    // the alert set determines which crawl_runs to return; when
    // hasAlert=false (the default — the Zod transform coerces missing
    // params to false) the list rows still need the badge annotation,
    // so we fetch alerts unconditionally. Scope is the categories a crawl
    // row surfaces (`crawl.event_count_dropped` for went-dark / sharp-drop,
    // `crawl.failed` for the consecutive-failure path,
    // `crawl.event_ceiling_suspected` for a capped catalogue) and only
    // unread rows — once an operator clears the notification, the badge
    // clears too.
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
            'crawl.event_ceiling_suspected',
            'crawl.url_coverage_gap',
          ]),
          isNull(notifications.readAt),
        ),
      )
      // Newest-first + bounded scan. Without explicit ordering the
      // "first match wins" tie-break below would be non-deterministic;
      // newest-first is also the intuitive choice (most recent alert
      // is the operator's likely concern).
      .orderBy(desc(notifications.createdAt))
      .limit(
        hasAlert
          ? ACTIVE_ALERT_SCAN_LIMIT_FILTERED
          : ACTIVE_ALERT_SCAN_LIMIT_DEFAULT,
      )
    // Defensive guard: anything other than a row array (unexpected DB
    // driver state, a test mock that didn't override this path) collapses
    // to "no alerts" rather than throwing and 500-ing the whole list.
    const candidateAlerts = Array.isArray(rawAlerts) ? rawAlerts : []

    // Pre-build the runId → ActiveCrawlAlert map. We do this before fetching
    // crawl_runs because when hasAlert=true we use this map to scope the
    // crawl_runs query — otherwise `hasAlert=true&limit=10` could return an
    // empty list even when older runs have unread alerts, because they fell
    // outside the first 10 rows by createdAt.
    const alertsByRunId = new Map<string, ActiveCrawlAlert>()
    for (const alert of candidateAlerts) {
      const meta = parseAlertMetadata(alert.metadata)
      if (!meta?.crawlRunId) continue
      const category = alert.category as ActiveCrawlAlert['category']
      // First match wins; multiple unread alerts on the same row would be
      // unusual and the operator's clearing one is enough to retest.
      if (!alertsByRunId.has(meta.crawlRunId)) {
        alertsByRunId.set(meta.crawlRunId, {
          notificationId: alert.id,
          category,
          // severity is only meaningful for 'crawl.event_count_dropped';
          // for 'crawl.failed' (and older event-count rows that predate
          // the field) it's null so the UI falls back to a neutral label.
          severity:
            category === 'crawl.event_count_dropped' && meta.severity
              ? meta.severity
              : null,
          ceilingKind:
            category === 'crawl.event_ceiling_suspected' && meta.kind
              ? meta.kind
              : null,
          coverageSeverity:
            category === 'crawl.url_coverage_gap' && meta.coverage
              ? meta.coverage
              : null,
        })
      }
    }

    // When hasAlert=true, restrict the crawl_runs query to ids we know
    // have an unread alert. This makes the "Show alerts only" filter look
    // back beyond the natural top-N window — a venue alerted three days
    // ago is still surfaced even if many newer runs have happened since.
    const alertedRunIds = Array.from(alertsByRunId.keys())
    const whereClauses = [
      venueId !== undefined ? eq(crawlRuns.venueId, venueId) : undefined,
      hasAlert ? inArray(crawlRuns.id, alertedRunIds) : undefined,
    ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause))

    // hasAlert=true with no matching ids → short-circuit; the inArray with
    // an empty array would be invalid SQL on some drivers and we already
    // know the answer is "no rows".
    if (hasAlert && alertedRunIds.length === 0) {
      return ctx.json({ success: true, data: [] })
    }

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
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(desc(crawlRuns.createdAt))
      .limit(limit)

    const data = dbRuns.map((run) => ({
      ...run,
      activeAlert: alertsByRunId.get(run.id) ?? null,
    }))

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
      // #1074 — Dashboard falls back to the configured strategy when a
      // venue hasn't produced a `lastRun.extractionStrategyUsed` yet
      // (never-crawled or crawl-failed venues), so surface it here.
      extractionStrategy: venues.extractionStrategy,
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
