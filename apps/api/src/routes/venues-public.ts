import { Hono } from 'hono'
import { clerkMiddleware } from '@hono/clerk-auth'
import { db, events, venues } from '@concert-crawl/db'
import { type SQL, and, asc, eq, gte } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { requireAuth } from '../middleware/auth.js'

export const venuesPublicRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  venuesPublicRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/venues — list active venues (public)
venuesPublicRouter.get('/', async (ctx) => {
  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      city: venues.city,
      timezone: venues.timezone,
      websiteUrl: venues.websiteUrl,
      active: venues.active,
      verified: venues.verified,
    })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(asc(venues.name))

  return ctx.json({ success: true, data: rows })
})

// GET /v1/venues/:slug — venue detail + upcoming events (public)
venuesPublicRouter.get('/:slug', async (ctx) => {
  const { slug } = ctx.req.param()

  const [venue] = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      city: venues.city,
      timezone: venues.timezone,
      websiteUrl: venues.websiteUrl,
      active: venues.active,
      verified: venues.verified,
    })
    .from(venues)
    .where(eq(venues.slug, slug))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const today = todayInTimezone(venue.timezone)

  const conditions: SQL[] = [
    eq(events.venueId, venue.id),
    eq(events.status, 'upcoming'),
    gte(events.date, today),
  ]

  const upcomingEvents = await db
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
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(50)

  return ctx.json({ success: true, data: { venue, upcomingEvents } })
})
