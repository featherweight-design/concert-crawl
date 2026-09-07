// apps/api/src/routes/history.ts
//
// The nights a user explicitly said "I'm going!" to (#70). Never derived from
// the watch list: Watching and Attending are separate concepts, and that
// separation is asserted at this boundary in the tests.
//
// #1357 split the response by time rather than adding a second endpoint: a
// "going" future show and a past one are the same row, so one read serves both
// and the two halves can never disagree about what attendance is. The split
// happens in memory against a `today` the same statement produced, because two
// queries would each evaluate their own NOW() and a show could fall through the
// gap — or land in both halves — if the clock crossed midnight between them.
// The route, the entitlement key and this module keep the `history` identifier;
// only the customer-facing label moved to "Concerts".
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
import { and, asc, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import { db, userEvents, events, venues } from '@concert-crawl/db'
import type { HistoryShow, HistoryResponse } from '@concert-crawl/types'
import { requireFeature } from '../middleware/entitlement.js'
import type { EntitlementVariables } from '../middleware/entitlement.js'
import { computeHistoryStats } from '../lib/history-stats.js'
import { buildHistoryIcs } from '../lib/ics.js'
import { parsePrice } from '../lib/price.js'

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

interface Attendance {
  past: HistoryShow[]
  upcoming: HistoryShow[]
}

// Mountain Time, not UTC: a late-evening Denver user would otherwise see
// tonight's show cross into Past hours early. One fragment, so the projection
// below and the upcoming-only predicate can never drift into two different
// notions of today. A function rather than a module-level constant: building it
// at import time makes `sql` load-bearing for every module that pulls the router
// in, which breaks unit tests that mock drizzle-orm without a `sql` export.
const todayMt = () => sql`((NOW() AT TIME ZONE ${MT_TIME_ZONE})::date)`

const loadAttendance = async (userId: string): Promise<Attendance> => {
  const rows = await db
    .select({
      // Selected as a column so the boundary is one value from one statement,
      // shared by both halves. Cast to text to compare against `events.date`,
      // which is also YYYY-MM-DD.
      today: sql<string>`${todayMt()}::text`,
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
        eq(events.hiddenFromConsumer, false),
        // #1212: event_status has no terminal value, so a past date plus
        // not-cancelled is the definition of "this show happened". Postponed
        // rows stay in — the surviving date row is the one that matters.
        // A cancelled show is equally not a night you are going to.
        ne(events.status, 'cancelled'),
        // Upcoming only: a delisted event 404s on the detail route, so keeping
        // it in this half would render a row whose only affordance is a dead
        // link. A past night stays whatever the crawler later does with the
        // listing — that half is the user's own record of where they were.
        or(isNull(events.firstMissingAt), sql`${events.date} < ${todayMt()}`),
      ),
    )
    .orderBy(asc(events.date), asc(events.showTime))

  const past: HistoryShow[] = []
  const upcoming: HistoryShow[] = []

  for (const row of rows) {
    // The query filters `attending_at IS NOT NULL`, so a null here is
    // impossible rather than merely unlikely. Dropping such a row keeps a
    // broken invariant off the surface instead of inventing a commitment the
    // user never made.
    if (!row.attendingAt) continue

    const show: HistoryShow = {
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
    }

    if (row.date < row.today) {
      past.push(show)
    } else {
      upcoming.push(show)
    }
  }

  // Past reads backwards from the most recent night; upcoming reads forwards
  // from the next one. Both start at today and move away from it.
  past.reverse()

  return { past, upcoming }
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

  // Past only. The export is a record of nights that happened; a show still
  // ahead of you belongs in your calendar via the show page, not via a file
  // named for your history.
  const { past } = await loadAttendance(authInfo.userId)

  return new Response(buildHistoryIcs(past), {
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

  const { past, upcoming } = await loadAttendance(authInfo.userId)
  const data: HistoryResponse = {
    past,
    upcoming,
    // Nights, venues, spend: all past-tense claims, so upcoming stays out.
    stats: computeHistoryStats(past),
  }

  return ctx.json({ success: true, data })
})
