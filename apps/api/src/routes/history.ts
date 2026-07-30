// apps/api/src/routes/history.ts
//
// Concert History (#70) — the nights a user explicitly said "I'm going!" to.
// Never derived from the watch list: Watching and Attending are separate
// concepts, and that separation is asserted at this boundary in the tests.
//
// #764 first-timer predicate (do not build until #764 opens):
//   SELECT EXISTS (
//     SELECT 1 FROM user_events ue
//     JOIN events ev ON ev.id = ue.event_id
//     WHERE ue.user_id = $1
//       AND ev.venue_id = $2
//       AND ue.attending_at IS NOT NULL
//       AND ev.date < (NOW() AT TIME ZONE 'America/Denver')::date
//   )
// user_events_user_attending_idx covers the user_id + attending_at half; the
// venue_id narrowing rides the events PK join. No new index needed for #764.

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { and, desc, eq, isNotNull, ne, sql } from 'drizzle-orm'
import { db, userEvents, events, venues } from '@concert-crawl/db'
import type { HistoryShow, HistoryResponse } from '@concert-crawl/types'
import { requireFeature } from '../middleware/entitlement.js'
import type { EntitlementVariables } from '../middleware/entitlement.js'
import { computeHistoryStats } from '../lib/history-stats.js'
import { buildHistoryIcs } from '../lib/ics.js'

const MT_TIME_ZONE = 'America/Denver'

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: MT_TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
})

// The event date is a plain YYYY-MM-DD calendar day, so it is anchored at noon
// UTC before formatting — midnight would slip to the previous day in Mountain
// Time and label every show one day early.
const formatDateLabel = (date: string): string =>
  dateLabelFormatter.format(new Date(`${date}T12:00:00Z`))

// `events.show_time` is a Postgres `time` column — a wall-clock time that is
// already Mountain, carrying no offset. Anchoring it to a real instant and
// converting to America/Denver would subtract the offset and turn a 20:00 door
// into 2:00 PM, so the HH:MM is formatted as-is via a UTC anchor that cancels
// out. Mirrors `formatShowTime` in apps/web consumer definitions/lib.ts.
const formatShowTime = (showTime: string | null): string | null => {
  if (!showTime) return null
  const [hours, minutes] = showTime.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return timeFormatter.format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
}

const parsePrice = (raw: string | null): number | null => {
  if (!raw) return null
  const parsed = parseFloat(raw)
  return Number.isNaN(parsed) ? null : parsed
}

const loadHistory = async (userId: string): Promise<HistoryShow[]> => {
  const rows = await db
    .select({
      eventId: events.id,
      artist: events.artist,
      date: events.date,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      genre: events.genre,
      attendingAt: userEvents.attendingAt,
      venueName: venues.name,
      venueSlug: venues.slug,
      neighborhood: venues.neighborhood,
    })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(userEvents.userId, userId),
        isNotNull(userEvents.attendingAt),
        // Mountain Time, not UTC: a late-evening Denver user would otherwise
        // see tonight's show appear in History hours early.
        sql`${events.date} < (NOW() AT TIME ZONE ${MT_TIME_ZONE})::date`,
        eq(events.hiddenFromConsumer, false),
        // #1212: event_status has no terminal value, so a past date plus
        // not-cancelled is the definition of "this show happened". Postponed
        // rows stay in — the surviving date row is the one that matters.
        ne(events.status, 'cancelled'),
      ),
    )
    .orderBy(desc(events.date), desc(events.showTime))

  // The query filters `attending_at IS NOT NULL`, so a null here is impossible
  // rather than merely unlikely. Dropping such a row keeps a broken invariant
  // out of History instead of inventing a commitment time the user never made.
  return rows
    .filter((row): row is (typeof rows)[number] & { attendingAt: Date } =>
      Boolean(row.attendingAt),
    )
    .map((row) => ({
      eventId: row.eventId,
      artist: row.artist,
      venueName: row.venueName,
      venueSlug: row.venueSlug,
      neighborhood: row.neighborhood ?? null,
      date: row.date,
      dateLabel: formatDateLabel(row.date),
      showTime: formatShowTime(row.showTime ?? null),
      priceFinal: parsePrice(row.ticketPriceMin ?? null),
      genre: row.genre?.[0] ?? null,
      attendingAt: row.attendingAt.toISOString(),
    }))
}

export const historyRouter = new Hono<{ Variables: EntitlementVariables }>()

historyRouter.use('*', clerkMiddleware())

// export.ics is gated on its own matrix key — a user can be entitled to read
// their history without being entitled to export it.
historyRouter.use('/export.ics', requireFeature('calendar-export'))
historyRouter.get('/export.ics', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const shows = await loadHistory(authInfo.userId)

  return new Response(buildHistoryIcs(shows), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="concert-crawl-history.ics"',
    },
  })
})

historyRouter.use('/', requireFeature('concert-history'))
historyRouter.get('/', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const shows = await loadHistory(authInfo.userId)
  const data: HistoryResponse = { shows, stats: computeHistoryStats(shows) }

  return ctx.json({ success: true, data })
})
