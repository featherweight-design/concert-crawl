import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db, venues, events, crawlRuns } from '@concert-crawl/db'
import { and, avg, count, desc, eq, gte, isNotNull, ne, not } from 'drizzle-orm'
import {
  dispatch,
  AegSchemaError,
  PlatformFetchDeadlineError,
} from '@concert-crawl/crawler-core/fetchers'
import type {
  PlatformProbeResult,
  VenueRobotsStatus,
} from '@concert-crawl/types'
import { getAuthUser } from '../../middleware/auth.js'
import { apiLogger } from '../../lib/logger.js'
import { detectTicketVendor } from '../../lib/detect-ticket-vendor.js'
import { runBackgroundTask } from '../../lib/background-tasks.js'
import type { AdminVariables } from './index.js'

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      'Slug must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
    ),
  websiteUrl: z.string().url(),
  city: z.string().default('Denver'),
  active: z.boolean().default(true),
  crawlDelayMs: z.number().int().min(1000).max(30000).default(3000),
  crawlWaitUntil: z
    .enum(['networkidle', 'load', 'domcontentloaded'])
    .default('networkidle'),
  crawlWaitForSelector: z
    .string()
    .max(200)
    .transform((val) => val.trim() || null)
    .nullable()
    .optional(),
  ticketVendor: z
    .enum([
      'axs',
      'ticketmaster',
      'seatgeek',
      'dice',
      'eventbrite',
      'venue_box_office',
      'unknown',
    ])
    .nullable()
    .optional(),
  address: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }),
  capacity: z.number().int().positive().nullable().optional(),
  venueType: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }),
  about: z
    .string()
    .max(280)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }),
  neighborhood: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }),
})

const updateVenueSchema = createVenueSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
    verified: z.boolean().optional(),
    verifiedBy: z.string().max(200).nullable().optional(),
    crawlMode: z.enum(['http', 'browser']).nullable().optional(),
    featured: z.boolean().optional(),
    priceUrl: z
      .string()
      .url()
      .nullable()
      .optional()
      .transform((val) => (val?.trim() === '' ? null : val)),
    extractionStrategy: z
      .enum(['structured_data', 'llm', 'manual'])
      .nullable()
      .optional(),
    debugCaptureHtml: z.boolean().optional(),
    // Per-platform fetcher dispatch (#623 / #721 / #665). platform values
    // are validated here (not a Postgres enum) so new adapters only touch
    // application code.
    platform: z.enum(['aeg', 'livenation']).nullable().optional(),
    // Empty/whitespace strings normalize to null (clear intent), matching
    // the other nullable string fields in this schema.
    platformVenueId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => (val === '' ? null : val)),
    // API-backed venue crawling (#506). When apiProvider is set, the crawler
    // (per #505) bypasses the HTML → JSON-LD → LLM cascade. null = None.
    apiProvider: z.enum(['venuepilot']).nullable().optional(),
    // Trim + null-if-empty, matching the address / crawlWaitForSelector shape
    // (returns the trimmed value, unlike priceUrl which returns the original).
    apiAccountId: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .transform((val) => {
        if (val == null) return val
        const trimmed = val.trim()
        return trimmed === '' ? null : trimmed
      }),
  })
  .refine(
    // When the payload sets platform non-null, platformVenueId must ride
    // along in the SAME payload as a non-empty string. Requiring it in the
    // payload (rather than accepting a previously-saved value) keeps the
    // rule simple and the admin UI always sends both together.
    (body) =>
      body.platform == null ||
      (typeof body.platformVenueId === 'string' &&
        body.platformVenueId.length > 0),
    {
      message: 'platformVenueId is required when platform is set',
      path: ['platformVenueId'],
    },
  )
  .refine(
    // When apiProvider is set, apiAccountId must ride along in the SAME
    // payload as a non-empty value. The transform above has already collapsed
    // empty/whitespace strings to null, so a null here means "missing."
    (body) => body.apiProvider == null || body.apiAccountId != null,
    {
      message: 'API account ID is required when an API provider is selected',
      path: ['apiAccountId'],
    },
  )

export const venuesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/venues — list all venues with upcoming event counts
venuesAdminRouter.get('/', async (ctx) => {
  const allVenues = await db.select().from(venues).orderBy(venues.name)

  const today = new Date().toISOString().slice(0, 10)
  const eventCounts = await db
    .select({ venueId: events.venueId, total: count(events.id) })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        isNotNull(events.venueId),
      ),
    )
    .groupBy(events.venueId)

  const countByVenueId = new Map(
    eventCounts.map((row) => [row.venueId, row.total]),
  )

  const venuesWithCounts = allVenues.map((venue) => ({
    ...venue,
    eventCount: countByVenueId.get(venue.id) ?? 0,
  }))

  return ctx.json({ success: true, data: venuesWithCounts })
})

// GET /v1/admin/venues/robots-check?url=<encoded> — advisory robots.txt check
venuesAdminRouter.get('/robots-check', async (ctx) => {
  const rawUrl = ctx.req.query('url')
  if (!rawUrl) {
    return ctx.json(
      { success: false, error: 'Missing required query param: url' },
      400,
    )
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return ctx.json({ success: false, error: 'Invalid URL format' }, 400)
  }

  const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`

  try {
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return ctx.json({ allowed: true, checkedAt: new Date().toISOString() })
    }

    const text = await response.text()
    const lines = text.split('\n').map((line) => line.trim())

    let inConcertCrawlBlock = false
    let inWildcardBlock = false
    let concertCrawlDisallowed = false
    let wildcardDisallowed = false

    for (const line of lines) {
      const lower = line.toLowerCase()
      if (lower.startsWith('user-agent:')) {
        const agent = line.slice('user-agent:'.length).trim().toLowerCase()
        inConcertCrawlBlock = agent === 'concertcrawl'
        inWildcardBlock = agent === '*'
      } else if (lower.startsWith('disallow:')) {
        const path = line.slice('disallow:'.length).trim()
        // Empty Disallow means "allow all" per robots.txt spec — only '/' blocks
        if (path === '/') {
          if (inConcertCrawlBlock) concertCrawlDisallowed = true
          if (inWildcardBlock) wildcardDisallowed = true
        }
      }
    }

    const disallowed = concertCrawlDisallowed || wildcardDisallowed

    return ctx.json({
      allowed: !disallowed,
      checkedAt: new Date().toISOString(),
    })
  } catch {
    return ctx.json({
      allowed: null,
      error: 'Could not fetch robots.txt',
    })
  }
})

// GET /v1/admin/venues/robots-audit — stored robots.txt status per active venue
venuesAdminRouter.get('/robots-audit', async (ctx) => {
  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      websiteUrl: venues.websiteUrl,
      robotsTxtAllowed: venues.robotsTxtAllowed,
      robotsTxtCheckedAt: venues.robotsTxtCheckedAt,
    })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(venues.name)

  const data: VenueRobotsStatus[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.websiteUrl,
    robotsTxtAllowed: row.robotsTxtAllowed,
    robotsTxtCheckedAt: row.robotsTxtCheckedAt?.toISOString() ?? null,
  }))

  return ctx.json({ success: true, data })
})

// GET /v1/admin/venues/:id — get single venue with crawl health stats
venuesAdminRouter.get('/:id', async (ctx) => {
  const { id } = ctx.req.param()
  const [venue] = await db.select().from(venues).where(eq(venues.id, id))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  // Last 7 days sparkline
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentRuns = await db
    .select({
      id: crawlRuns.id,
      status: crawlRuns.status,
      durationMs: crawlRuns.durationMs,
      createdAt: crawlRuns.createdAt,
    })
    .from(crawlRuns)
    .where(
      and(eq(crawlRuns.venueId, id), gte(crawlRuns.createdAt, sevenDaysAgo)),
    )
    .orderBy(desc(crawlRuns.createdAt))

  // Build sparkline: one entry per calendar day over the past 7 days.
  // 'skipped' is healthy alongside 'success' (page-hash dedup), so days
  // ending in either status render green.
  const dayMap = new Map<string, boolean>()
  for (const run of recentRuns) {
    const dayKey = run.createdAt.toISOString().slice(0, 10)
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, run.status === 'success' || run.status === 'skipped')
    }
  }

  const sparkline: { date: string; success: boolean; hasRun: boolean }[] = []
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date()
    day.setDate(day.getDate() - dayOffset)
    const dayKey = day.toISOString().slice(0, 10)
    if (dayMap.has(dayKey)) {
      sparkline.push({
        date: dayKey,
        success: dayMap.get(dayKey)!,
        hasRun: true,
      })
    } else {
      sparkline.push({ date: dayKey, success: false, hasRun: false })
    }
  }

  const runDays = sparkline.filter((entry) => entry.hasRun).length
  const successDays = sparkline.filter((entry) => entry.success).length
  const sevenDayPercent =
    runDays > 0 ? Math.round((successDays / runDays) * 100) : 0

  const avgDurationResult = await db
    .select({ avg: avg(crawlRuns.durationMs) })
    .from(crawlRuns)
    .where(
      and(eq(crawlRuns.venueId, id), gte(crawlRuns.createdAt, sevenDaysAgo)),
    )

  const avgDurationMs = avgDurationResult[0]?.avg
    ? Math.round(Number(avgDurationResult[0].avg))
    : null

  const [eventsCountResult] = await db
    .select({ total: count(events.id) })
    .from(events)
    .where(eq(events.venueId, id))

  const eventsTracked = eventsCountResult?.total ?? 0

  const lastCrawledAt = venue.lastCrawledAt?.toISOString() ?? null

  const crawlHealth = {
    sevenDayPercent,
    sparkline,
    lastCrawledAt,
    avgDurationMs,
    eventsTracked,
    consecutiveFails: venue.consecutiveFailures,
  }

  return ctx.json({ success: true, data: { ...venue, crawlHealth } })
})

// POST /v1/admin/venues — create venue with slug uniqueness check
venuesAdminRouter.post(
  '/',
  zValidator('json', createVenueSchema),
  async (ctx) => {
    const body = ctx.req.valid('json')

    const [slugConflict] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, body.slug))

    if (slugConflict) {
      return ctx.json(
        { success: false, error: 'Slug already in use', field: 'slug' },
        409,
      )
    }

    const [venue] = await db
      .insert(venues)
      .values({
        ...body,
        ticketVendor: body.ticketVendor ?? null,
        verified: true,
      })
      .returning()

    if (!venue) {
      return ctx.json(
        { success: false, error: 'Venue created but no row was returned' },
        500,
      )
    }

    // Detect vendor in the background — does not block the response
    if (!body.ticketVendor) {
      runBackgroundTask(async () => {
        try {
          const detectedVendor = await detectTicketVendor(body.websiteUrl)
          await db
            .update(venues)
            .set({ ticketVendor: detectedVendor })
            .where(eq(venues.id, venue.id))
        } catch (err) {
          apiLogger.warn({ err }, 'detectTicketVendor background update failed')
        }
      })
    }

    ctx.set('auditAction', 'venue.create')
    ctx.set('auditTargetId', venue.id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: venue }, 201)
  },
)

// PATCH /v1/admin/venues/:id — update venue with slug uniqueness check
venuesAdminRouter.patch(
  '/:id',
  zValidator('json', updateVenueSchema),
  async (ctx) => {
    const { id } = ctx.req.param()
    const body = ctx.req.valid('json')

    const [existing] = await db.select().from(venues).where(eq(venues.id, id))
    if (!existing) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    if (body.slug && body.slug !== existing.slug) {
      const [slugConflict] = await db
        .select({ id: venues.id })
        .from(venues)
        .where(and(eq(venues.slug, body.slug), ne(venues.id, id)))

      if (slugConflict) {
        return ctx.json(
          { success: false, error: 'Slug already in use', field: 'slug' },
          409,
        )
      }
    }

    const verificationFields =
      body.verified === true
        ? { verifiedAt: new Date() }
        : body.verified === false
          ? { verifiedBy: null, verifiedAt: null }
          : {}

    // Ensure only one flagship at a time — clear others before setting this one
    if (body.featured === true) {
      await db
        .update(venues)
        .set({ featured: false })
        .where(and(eq(venues.featured, true), not(eq(venues.id, id))))
    }

    // Clear-on-null (#721 wins over #665 here — the two issues diverged on
    // whether clearing platform should orphan platformVenueId): when the
    // payload sets platform to null, force platformVenueId to null in the
    // same update even if the payload didn't mention it. A stale shard id
    // with no platform would silently re-activate if platform is re-set.
    const platformClearFields =
      body.platform === null ? { platformVenueId: null } : {}

    // Same orphan-prevention as platform (#506): clearing apiProvider forces
    // apiAccountId to null in the same update, so a stale account id can't
    // silently re-activate if the provider is re-set later.
    const apiProviderClearFields =
      body.apiProvider === null ? { apiAccountId: null } : {}

    const nextPlatform =
      body.platform !== undefined ? body.platform : existing.platform
    const nextPlatformVenueId =
      body.platform === null
        ? null
        : body.platformVenueId !== undefined
          ? body.platformVenueId
          : existing.platformVenueId

    // The schema refine only sees the payload; this guards the merged
    // result against orphaned state (id without platform, or platform
    // losing its id via a partial PATCH). Only enforced when the payload
    // touches platform fields — unrelated PATCHes (verify, pause, rename)
    // must not start failing on venues with pre-existing orphaned state.
    const touchesPlatformFields =
      body.platform !== undefined || body.platformVenueId !== undefined
    if (touchesPlatformFields) {
      if (nextPlatform === null && nextPlatformVenueId !== null) {
        return ctx.json(
          {
            success: false,
            error: 'platformVenueId requires platform to be set',
            field: 'platformVenueId',
          },
          400,
        )
      }
      if (nextPlatform !== null && nextPlatformVenueId === null) {
        return ctx.json(
          {
            success: false,
            error: 'platformVenueId is required when platform is set',
            field: 'platformVenueId',
          },
          400,
        )
      }
    }

    const nextApiProvider =
      body.apiProvider !== undefined ? body.apiProvider : existing.apiProvider
    const nextApiAccountId =
      body.apiProvider === null
        ? null
        : body.apiAccountId !== undefined
          ? body.apiAccountId
          : existing.apiAccountId

    // Same merged-state guard as platform (#506): the schema refine only sees
    // the payload, so a partial PATCH — e.g. { apiAccountId: '1105' } against a
    // venue with apiProvider = null, or { apiProvider: 'venuepilot' } against
    // one with no saved account id — could orphan the invariant. Only enforced
    // when the payload touches an API field so unrelated PATCHes never fail on
    // pre-existing orphaned rows.
    const touchesApiFields =
      body.apiProvider !== undefined || body.apiAccountId !== undefined
    if (touchesApiFields) {
      if (nextApiProvider === null && nextApiAccountId !== null) {
        return ctx.json(
          {
            success: false,
            error: 'API account ID requires an API provider to be set',
            field: 'apiAccountId',
          },
          400,
        )
      }
      if (nextApiProvider !== null && nextApiAccountId === null) {
        return ctx.json(
          {
            success: false,
            error:
              'API account ID is required when an API provider is selected',
            field: 'apiAccountId',
          },
          400,
        )
      }
    }

    // Browser-mode timing-race guard (#1072). A venue that falls through to
    // the HTML → JSON-LD → LLM cascade in 'browser' mode extracts from
    // page.content(); without a crawlWaitForSelector there is nothing to gate
    // on before capture, so a slow client-side render is captured as an empty
    // DOM → 0 events (how Hi-Dive and Red Rocks went dark on unlucky runs).
    // A venue is exempt only when a platform / API fetcher can FULLY handle
    // it. We ask dispatch() directly on the merged venue state rather than
    // re-deriving the match: canHandle() requires more than a non-null id
    // (AEG needs platformVenueId.length > 0, VenuePilot apiAccountId.trim()
    // .length > 0), so an empty-string id falls through to the HTML cascade
    // and needs the selector — as does a whitespace-only VenuePilot
    // apiAccountId, which VenuePilot trims (AEG does not trim, so a
    // whitespace platformVenueId is still treated as configured). A venue
    // with the platform/provider set but no usable id is NOT handled. Only
    // checked when the payload touches the merged browser-gate state — the
    // crawl mode, the selector, OR a platform/API field. Clearing platform or
    // apiProvider on a fetcher-exempt browser venue removes the exemption and
    // drops it back into the HTML cascade, so those fields gate the guard too;
    // otherwise a PATCH { platform: null } would silently reintroduce the
    // timing race. Unrelated PATCHes (verify, pause, rename) leave every gate
    // field untouched, so the guard never fails on a pre-existing venue.
    const nextCrawlMode =
      body.crawlMode !== undefined ? body.crawlMode : existing.crawlMode
    const nextWaitForSelector =
      body.crawlWaitForSelector !== undefined
        ? body.crawlWaitForSelector
        : existing.crawlWaitForSelector
    const touchesBrowserGate =
      body.crawlMode !== undefined ||
      body.crawlWaitForSelector !== undefined ||
      body.platform !== undefined ||
      body.platformVenueId !== undefined ||
      body.apiProvider !== undefined ||
      body.apiAccountId !== undefined
    const fetcherHandles =
      dispatch({
        ...existing,
        platform: nextPlatform,
        platformVenueId: nextPlatformVenueId,
        apiProvider: nextApiProvider,
        apiAccountId: nextApiAccountId,
      }) !== null
    if (
      touchesBrowserGate &&
      nextCrawlMode === 'browser' &&
      !fetcherHandles &&
      nextWaitForSelector == null
    ) {
      return ctx.json(
        {
          success: false,
          error:
            'crawlWaitForSelector is required for browser-mode venues — without it a slow client-side render is captured as an empty page and returns 0 events',
          field: 'crawlWaitForSelector',
        },
        400,
      )
    }

    const [updated] = await db
      .update(venues)
      .set({
        ...body,
        ...platformClearFields,
        ...apiProviderClearFields,
        ...verificationFields,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, id))
      .returning()

    // Distinct audit action when platform routing changed, with a
    // before/after snapshot — this config redirects the crawler entirely,
    // so we want the change trail to be greppable.
    const platformChanged =
      nextPlatform !== existing.platform ||
      nextPlatformVenueId !== existing.platformVenueId

    if (platformChanged) {
      ctx.set('auditAction', 'venue.platform_changed')
      ctx.set('auditMeta', {
        before: {
          platform: existing.platform,
          platformVenueId: existing.platformVenueId,
        },
        after: {
          platform: nextPlatform,
          platformVenueId: nextPlatformVenueId,
        },
      })
    } else {
      ctx.set('auditAction', 'venue.update')
    }
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: updated })
  },
)

// A hung platform CDN connection must not pin an API worker slot — the
// probe aborts and reports fetch_error after this window. This is the
// whole-probe ceiling, not a per-request one: the Live Nation adapter
// reads a sitemap plus a calendar page per rolling month, so a per-request
// value alone would let one probe run for minutes (#1184).
const PROBE_TIMEOUT_MS = 15_000

const probePlatformSchema = z.object({
  platform: z.enum(['aeg', 'livenation']).nullable().optional(),
  // Whitespace-only would pass the fetcher's truthy canHandle() check and
  // turn a missing_config diagnosis into a doomed fetch — normalize to null.
  platformVenueId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val)),
})

// POST /v1/admin/venues/:id/probe-platform — dry-run a platform fetch (#665)
// Probes the proposed platform config from the body when provided, else the
// venue's saved config. Nothing is written: no crawl_runs row, no events —
// the admin gets a { ok, ... } diagnosis envelope with HTTP 200 either way.
venuesAdminRouter.post(
  '/:id/probe-platform',
  zValidator('json', probePlatformSchema),
  async (ctx) => {
    const { id } = ctx.req.param()
    const body = ctx.req.valid('json')

    const [venue] = await db.select().from(venues).where(eq(venues.id, id))
    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    // Overlay proposed config (when present in the payload) on the saved
    // venue row. `undefined` means "not proposed — use saved"; `null` means
    // "proposed as cleared".
    const probedPlatform =
      body.platform !== undefined ? body.platform : venue.platform
    // Mirror the PATCH route's clear-on-null semantics: a null platform
    // clears the venue ID too, so the probe (and its audit metadata) never
    // describes an orphaned { platform: null, platformVenueId } state.
    const probedPlatformVenueId =
      probedPlatform === null
        ? null
        : body.platformVenueId !== undefined
          ? body.platformVenueId
          : venue.platformVenueId
    const candidate = {
      ...venue,
      platform: probedPlatform,
      platformVenueId: probedPlatformVenueId,
    }

    const probeResult = await (async (): Promise<PlatformProbeResult> => {
      const fetcher = dispatch(candidate)
      if (!fetcher) {
        return {
          ok: false,
          reason: 'missing_config',
          error:
            'No platform fetcher matches this config — platform is unset or unregistered, or platformVenueId is missing',
        }
      }
      const startedAt = Date.now()
      try {
        const result = await fetcher.fetch(candidate, {
          crawlDelayMs: 0,
          perRequestTimeoutMs: PROBE_TIMEOUT_MS,
          overallTimeoutMs: PROBE_TIMEOUT_MS,
        })
        return {
          ok: true,
          eventsFound: result.events.length,
          fetchLatencyMs: Date.now() - startedAt,
          sourceUrl: result.sourceUrl,
        }
      } catch (err) {
        apiLogger.warn(
          { err, venueId: id, platform: probedPlatform },
          'probe-platform: platform fetch failed',
        )
        const message = err instanceof Error ? err.message : String(err)
        if (err instanceof AegSchemaError) {
          return { ok: false, reason: 'schema_error', error: message }
        }
        // Stays fetch_error rather than earning its own reason: the admin's
        // next step is the same either way, and the message already names
        // the budget and the request that overran it.
        if (err instanceof PlatformFetchDeadlineError) {
          return {
            ok: false,
            reason: 'fetch_error',
            error: `${message} — the platform responded too slowly to finish a probe`,
          }
        }
        return { ok: false, reason: 'fetch_error', error: message }
      }
    })()

    ctx.set('auditAction', 'venue.platform_probe')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)
    ctx.set('auditMeta', {
      platform: probedPlatform,
      platformVenueId: probedPlatformVenueId,
      outcome: probeResult.ok ? 'ok' : probeResult.reason,
    })

    return ctx.json({ success: true, data: probeResult })
  },
)

// POST /v1/admin/venues/:id/generate-about — LLM-generate capacity, venueType, neighborhood, and about copy
// Does NOT persist to DB; returns suggestions for admin review before saving
venuesAdminRouter.post('/:id/generate-about', async (ctx) => {
  const { id } = ctx.req.param()

  const [venue] = await db
    .select({
      name: venues.name,
      address: venues.address,
      venueType: venues.venueType,
    })
    .from(venues)
    .where(eq(venues.id, id))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const generateResponseSchema = z.object({
    capacity: z.number().int().positive().nullable(),
    venueType: z.string().min(1).max(100),
    neighborhood: z.string().min(1).max(100),
    about: z.string().min(10).max(280),
  })

  const prompt = `You are writing copy for Concert Crawl — a Denver live music calendar for people who actually go to shows, not tourists reading a brochure. Voice: direct, local, slightly irreverent. Short sentences. No fluff.

Venue: ${venue.name}
Address: ${venue.address ?? 'unknown'}
Current type: ${venue.venueType ?? 'unknown'}

Generate a JSON object with:
- "capacity": the venue's approximate standing/seated capacity as an integer (null if unknown)
- "venueType": a concise venue type (e.g. "Amphitheater", "Theater", "Concert Hall", "Music Hall", "Ballroom", "Bar", "Auditorium", "Outdoor Pavilion")
- "neighborhood": the Denver neighborhood or city where the venue is located (e.g. "Capitol Hill", "RiNo", "LoDo", "South Broadway", "Morrison"). Use well-known local neighborhood names, not zip codes or suburbs.
- "about": 1-2 punchy sentences — what the room is like, why it matters to Denver music fans. Be specific. No clichés. Max 280 characters.

Respond with only valid JSON, no markdown, no extra text.`

  try {
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create(
      {
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: AbortSignal.timeout(30_000) },
    )

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return ctx.json(
        { success: false, error: 'No text response from model' },
        503,
      )
    }

    const rawText = textBlock.text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return ctx.json(
        { success: false, error: 'Model returned invalid JSON' },
        503,
      )
    }

    const result = generateResponseSchema.safeParse(parsed)
    if (!result.success) {
      return ctx.json(
        {
          success: false,
          error: 'Model response did not match expected shape',
        },
        503,
      )
    }

    return ctx.json({ success: true, data: result.data })
  } catch (err) {
    apiLogger.error({ err }, 'generate-about: Anthropic call failed')
    return ctx.json(
      { success: false, error: 'Failed to generate venue description' },
      503,
    )
  }
})

// DELETE /v1/admin/venues/:id — hard delete; nulls venue_id on events, cascades crawl_runs
venuesAdminRouter.delete('/:id', async (ctx) => {
  const { id } = ctx.req.param()

  const [existing] = await db.select().from(venues).where(eq(venues.id, id))
  if (!existing) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const eventsDetached = await db.transaction(async (tx) => {
    // Count events before detaching
    const [eventCountResult] = await tx
      .select({ total: count(events.id) })
      .from(events)
      .where(eq(events.venueId, id))

    const detachedCount = eventCountResult?.total ?? 0

    // Null out venue_id on events so they remain published
    await tx.update(events).set({ venueId: null }).where(eq(events.venueId, id))

    // Hard delete venue; crawl_runs cascade-delete automatically
    await tx.delete(venues).where(eq(venues.id, id))

    return detachedCount
  })

  ctx.set('auditAction', 'venue.delete')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', getAuthUser(ctx).userId)
  ctx.set('auditMeta', { snapshot: existing, eventsDetached })

  return ctx.json({ success: true, data: { eventsDetached } })
})
