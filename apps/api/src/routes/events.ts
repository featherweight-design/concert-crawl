import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, events, venues, userEvents } from '@concert-crawl/db'
import {
  type SQL,
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { apiLogger } from '../lib/logger.js'
import { requireAuth } from '../middleware/auth.js'

const uuidSchema = z.string().uuid()

const listEventsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  venueSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  filterPrice: z.enum(['under-25', '25-50', '50-plus', 'tbd']).optional(),
  filterVibe: z
    .enum([
      'rock',
      'indie',
      'hip-hop',
      'electronic',
      'country',
      'jazz',
      'pop',
      'metal',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const eventsRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  eventsRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/events — public event listing with filters and pagination
eventsRouter.get('/', zValidator('query', listEventsSchema), async (ctx) => {
  const {
    from,
    to,
    venueSlug,
    search,
    limit,
    offset,
    filterPrice,
    filterVibe,
  } = ctx.req.valid('query')

  const conditions: SQL[] = [
    eq(events.status, 'upcoming'),
    gte(events.date, from ?? todayInTimezone('UTC')),
  ]

  if (to) {
    conditions.push(lte(events.date, to))
  }

  if (venueSlug) {
    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, venueSlug))
      .limit(1)
    if (!venue) {
      return ctx.json({
        success: true,
        data: { data: [], total: 0, limit, offset },
      })
    }
    conditions.push(eq(events.venueId, venue.id))
  }

  if (search) {
    const searchCondition = or(
      ilike(events.title, `%${search}%`),
      ilike(events.artist, `%${search}%`),
      ilike(venues.name, `%${search}%`),
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const priceCondition =
    filterPrice === 'under-25'
      ? and(isNotNull(events.ticketPriceMin), lt(events.ticketPriceMin, '25'))
      : filterPrice === '25-50'
        ? and(
            isNotNull(events.ticketPriceMin),
            gte(events.ticketPriceMin, '25'),
            lt(events.ticketPriceMin, '50'),
          )
        : filterPrice === '50-plus'
          ? and(
              isNotNull(events.ticketPriceMin),
              gte(events.ticketPriceMin, '50'),
            )
          : filterPrice === 'tbd'
            ? and(isNull(events.ticketPriceMin), isNull(events.ticketPriceMax))
            : undefined

  if (priceCondition) conditions.push(priceCondition)

  if (filterVibe) {
    conditions.push(sql`${events.genre} && ARRAY[${filterVibe}]::text[]`)
  }

  const where = and(...conditions)

  const countResult = await db
    .select({ total: count() })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(where)

  const total = countResult[0]?.total ?? 0

  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(where)
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(limit)
    .offset(offset)

  return ctx.json({
    success: true,
    data: { data: rows, total, limit, offset },
  })
})

// GET /v1/events/:id — single event with venue, watching count, setlist
eventsRouter.get('/:id', clerkMiddleware(), async (ctx) => {
  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  const id = parsed.data

  const [row] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      setlist: events.setlist,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, id))

  if (!row) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  const [watchCountRow] = await db
    .select({ total: count() })
    .from(userEvents)
    .where(and(eq(userEvents.eventId, id), eq(userEvents.status, 'watching')))

  const watchingCount = watchCountRow?.total ?? 0

  const authInfo = getAuth(ctx)
  let isWatching = false
  if (authInfo?.userId) {
    const [watchRow] = await db
      .select({ id: userEvents.id })
      .from(userEvents)
      .where(
        and(
          eq(userEvents.userId, authInfo.userId),
          eq(userEvents.eventId, id),
          eq(userEvents.status, 'watching'),
        ),
      )
      .limit(1)
    isWatching = Boolean(watchRow)
  }

  // Derive priceStatus from user_events sold-out submissions.
  // A show is considered sold out when any corroborated community submission
  // carries tier === 'soldout'. This is a lightweight heuristic until a
  // dedicated sold_out flag lands on the events table.
  // For now we surface null — the field exists on the type so the web layer
  // can consume it without a breaking change once real data arrives.
  const priceStatus: 'live' | 'soldout' | null = null

  return ctx.json({
    success: true,
    data: { ...row, watching: watchingCount, isWatching, priceStatus },
  })
})

// POST /v1/events/:id/watch — opt in to watching
eventsRouter.post('/:id/watch', clerkMiddleware(), async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)

  const eventId = parsed.data

  const [eventRow] = await db
    .select({ ticketPriceMin: events.ticketPriceMin })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1)

  if (!eventRow)
    return ctx.json({ success: false, error: 'Event not found' }, 404)

  const savedPrice = eventRow.ticketPriceMin ?? null

  try {
    await db
      .insert(userEvents)
      .values({
        userId: authInfo.userId,
        eventId,
        status: 'watching',
        savedPrice,
      })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        set: { status: 'watching', savedPrice },
      })
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'watch insert failed',
    )
    return ctx.json({ success: false, error: 'Failed to watch event' }, 500)
  }

  return ctx.json({ success: true, data: { watching: true } })
})

// DELETE /v1/events/:id/watch — opt out of watching
eventsRouter.delete('/:id/watch', clerkMiddleware(), async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)

  const eventId = parsed.data

  const [existing] = await db
    .select({ id: userEvents.id })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.eventId, eventId),
        eq(userEvents.status, 'watching'),
      ),
    )
    .limit(1)

  if (existing) {
    await db.delete(userEvents).where(eq(userEvents.id, existing.id))
  }

  return ctx.json({ success: true, data: { watching: false } })
})
