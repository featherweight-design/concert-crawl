// apps/api/src/routes/watching.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq, and, gte, asc } from 'drizzle-orm'
import { z } from 'zod'
import { db, userEvents, events, venues } from '@concert-crawl/db'
import type { WatchingShow, WatchToggleResponse } from '@concert-crawl/types'
import { apiLogger } from '../lib/logger.js'
import { releaseWatch } from '../lib/user-events.js'

const uuidSchema = z.string().uuid()

// Watching is FREE for all signed-in plans (locked decision, #781 R6 —
// ENTITLEMENTS_MATRIX.watching). Do NOT add a requireFeature() gate here;
// auth is the only requirement.
export const watchingRouter = new Hono()

watchingRouter.use('*', clerkMiddleware())

function mapSourceKind(
  priceSource: string | null,
): 'primary' | 'resale' | 'community' | null {
  if (!priceSource) return null
  if (priceSource === 'seatgeek') return 'resale'
  if (priceSource === 'community') return 'community'
  return 'primary'
}

function resolveWatchStatus(
  eventStatus: 'upcoming' | 'cancelled' | 'postponed',
): 'live' | 'soldout' {
  if (eventStatus === 'cancelled') return 'soldout'
  return 'live'
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const parsed = parseFloat(raw)
  if (Number.isNaN(parsed)) return null
  return parsed
}

// GET /v1/watching — return user's watched upcoming shows
watchingRouter.get('/', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const today = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      userEventId: userEvents.id,
      eventId: userEvents.eventId,
      savedPrice: userEvents.savedPrice,
      savedAt: userEvents.createdAt,
      artist: events.artist,
      date: events.date,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketLinks: events.ticketLinks,
      ticketPriceMin: events.ticketPriceMin,
      priceSource: events.priceSource,
      eventStatus: events.status,
      imageUrl: events.imageUrl,
      updatedAt: events.updatedAt,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.status, 'watching'),
        gte(events.date, today),
        // PR 6 — hide non-concert events from the watching list too.
        eq(events.hiddenFromConsumer, false),
      ),
    )
    .orderBy(asc(events.date), asc(events.showTime))

  const data: WatchingShow[] = rows.map((row) => ({
    userEventId: row.userEventId,
    eventId: row.eventId,
    artist: row.artist,
    venueName: row.venueName,
    venueSlug: row.venueSlug,
    date: row.date,
    showTime: row.showTime ?? null,
    ticketUrl: row.ticketUrl ?? null,
    ticketLinks: row.ticketLinks ?? null,
    savedAt: row.savedAt.toISOString(),
    savedPrice: parsePrice(row.savedPrice ?? null),
    currentPrice: parsePrice(row.ticketPriceMin ?? null),
    sourceKind: mapSourceKind(row.priceSource ?? null),
    eventStatus: row.eventStatus,
    watchStatus: resolveWatchStatus(row.eventStatus),
    updatedAt: row.updatedAt.toISOString(),
    imageUrl: row.imageUrl ?? null,
  }))

  return ctx.json({ success: true, data })
})

// PUT /v1/watching/:eventId — toggle watch on/off
watchingRouter.put('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const eventIdRaw = ctx.req.param('eventId')
  const parsed = uuidSchema.safeParse(eventIdRaw)
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)
  }
  const eventId = parsed.data

  // Check for any existing row for this user+event (regardless of status),
  // so we don't violate the unique (user_id, event_id) index on insert.
  const [existing] = await db
    .select({ id: userEvents.id, status: userEvents.status })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.eventId, eventId),
      ),
    )
    .limit(1)

  if (existing?.status === 'watching') {
    // Already watching — release it. Not a bare DELETE: the row may also carry
    // attendance, which must survive un-watching (#70).
    await releaseWatch(authInfo.userId, eventId)

    const response: WatchToggleResponse = { watching: false, savedPrice: null }
    return ctx.json({ success: true, data: response })
  }

  // Not watching — fetch current price and upsert to watching.
  // PR 6 — non-concert events are 404 for consumers, including the watch flow.
  const [eventRow] = await db
    .select({ ticketPriceMin: events.ticketPriceMin })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
    .limit(1)

  if (!eventRow) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  const currentPriceRaw = eventRow.ticketPriceMin ?? null
  const savedPrice = parsePrice(currentPriceRaw)
  const savedPriceStr = savedPrice !== null ? String(savedPrice) : null

  try {
    await db
      .insert(userEvents)
      .values({
        userId: authInfo.userId,
        eventId,
        status: 'watching',
        savedPrice: savedPriceStr,
      })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        set: { status: 'watching', savedPrice: savedPriceStr },
      })
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'watch upsert failed',
    )
    return ctx.json({ success: false, error: 'Failed to save watch' }, 500)
  }

  const response: WatchToggleResponse = { watching: true, savedPrice }
  return ctx.json({ success: true, data: response })
})
