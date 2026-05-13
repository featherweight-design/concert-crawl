import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venues, events, crawlRuns } from '@concert-crawl/db'
import { and, avg, count, desc, eq, gte, isNotNull, ne } from 'drizzle-orm'
import { getAuthUser } from '../../middleware/auth.js'
import { detectTicketVendor } from '../../lib/detect-ticket-vendor.js'
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
})

const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
  verifiedBy: z.string().max(200).nullable().optional(),
})

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

  // Build sparkline: one entry per calendar day over the past 7 days
  const dayMap = new Map<string, boolean>()
  for (const run of recentRuns) {
    const dayKey = run.createdAt.toISOString().slice(0, 10)
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, run.status === 'success')
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

    const detectedVendor =
      body.ticketVendor ?? (await detectTicketVendor(body.websiteUrl))

    const [venue] = await db
      .insert(venues)
      .values({ ...body, ticketVendor: detectedVendor, verified: true })
      .returning()

    if (!venue) {
      return ctx.json(
        { success: false, error: 'Venue created but no row was returned' },
        500,
      )
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

    const [updated] = await db
      .update(venues)
      .set({ ...body, ...verificationFields, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning()

    ctx.set('auditAction', 'venue.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: updated })
  },
)

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
