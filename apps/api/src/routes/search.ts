import { Hono } from 'hono'
import { clerkMiddleware } from '@hono/clerk-auth'
import { db, events, userEvents, venues } from '@concert-crawl/db'
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { requireAuth } from '../middleware/auth.js'

export const searchRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  searchRouter.use('*', clerkMiddleware(), requireAuth)
}

// GET /v1/search/popular — top 5 upcoming events by watcher count, no auth required
searchRouter.get('/popular', async (ctx) => {
  const today = todayInTimezone('UTC')

  const watcherCount = sql<number>`cast(count(${userEvents.id}) as int)`

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      date: events.date,
      ticketPriceMin: events.ticketPriceMin,
      watcherCount,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(
      userEvents,
      and(eq(userEvents.eventId, events.id), eq(userEvents.status, 'watching')),
    )
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        // PR 6 — exclude non-concert events from search.
        eq(events.hiddenFromConsumer, false),
      ),
    )
    .groupBy(events.id, venues.name, venues.slug)
    .orderBy(desc(watcherCount), asc(events.date))
    .limit(5)

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    date: row.date,
    ticketPriceMin: row.ticketPriceMin,
    watcherCount: row.watcherCount,
    venue: { name: row.venueName, slug: row.venueSlug },
  }))

  return ctx.json({ success: true, data })
})
