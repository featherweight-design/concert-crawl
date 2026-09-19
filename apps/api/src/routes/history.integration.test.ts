// Integration tests for GET /v1/history and /v1/history/export.ics (#70).
// The Watching-≠-Attending guarantee is asserted here at the API boundary: a
// past show the user only watched must never appear in History.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { sql } from 'drizzle-orm'
import { subscriptions } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedArtist,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'
import { ENTITLEMENT_REQUIRED_CODE } from '../middleware/entitlement.js'

const app = createApp()
const USER_ID = 'user_history_test'
const ATTENDED = new Date('2026-05-01T00:00:00.000Z')

const setAuth = (userId = USER_ID, role = 'user'): void => {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

const seedSupporter = async (userId = USER_ID): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'supporter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}

type HistoryRow = {
  eventId: string
  artist: string
  artistPhotoUrl: string | null
  dateLabel: string
  showTime: string | null
}

type Body = {
  success: boolean
  data: {
    past: HistoryRow[]
    upcoming: HistoryRow[]
    stats: { nights: number; venues: number; totalSpent: number | null }
  }
}

const getHistory = async (): Promise<Body> => {
  const res = await app.request('/v1/history')
  expect(res.status).toBe(200)
  return (await res.json()) as Body
}

describe('GET /v1/history', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/history')
    expect(res.status).toBe(401)
  })

  it('returns 403 with the typed code for a plan the matrix denies', async () => {
    setAuth()
    const res = await app.request('/v1/history')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string; feature: string }
    expect(body.code).toBe(ENTITLEMENT_REQUIRED_CODE)
    expect(body.feature).toBe('concert-history')
  })

  it('returns an empty history with zeroed stats', async () => {
    setAuth()
    await seedSupporter()
    const body = await getHistory()
    expect(body.data.past).toHaveLength(0)
    expect(body.data.stats.nights).toBe(0)
    expect(body.data.stats.totalSpent).toBeNull()
  })

  it('returns a past attended show with formatted labels and stats', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue({ name: 'Ogden Theatre', slug: 'ogden' })
    const event = await seedEvent(venue.id, {
      artist: 'Khruangbin',
      date: '2026-06-01',
      showTime: '20:00:00',
      ticketPriceMin: '45.00',
    })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(1)
    expect(body.data.past[0]?.artist).toBe('Khruangbin')
    // Mountain Time, not UTC — a UTC label would read "Jun 1" off by a day for
    // late-evening rows.
    expect(body.data.past[0]?.dateLabel).toBe('Mon, Jun 1')
    // show_time is a wall-clock Postgres `time` already in Mountain, so it must
    // pass through untouched. Treating it as a UTC instant and converting to
    // Denver would render this 20:00 door as "2:00 PM".
    expect(body.data.past[0]?.showTime).toBe('8:00 PM')
    expect(body.data.stats.nights).toBe(1)
    expect(body.data.stats.venues).toBe(1)
    expect(body.data.stats.totalSpent).toBe(45)
  })

  // The headliner portrait, on the same terms as Watching and Browse. This
  // route did not join `artists`, so every night on Concerts wore a generated
  // glyph even when the artist had a real face everywhere else.
  describe('the artistPhotoUrl join', () => {
    const PORTRAIT = 'https://i.scdn.co/image/headliner'

    it('serializes the portrait, and null when nothing matches', async () => {
      setAuth()
      await seedSupporter()
      const venue = await seedVenue({ slug: 'history-photo' })
      await seedArtist({ name: 'Khruangbin', photoUrl: PORTRAIT })
      const matched = await seedEvent(venue.id, {
        artist: 'Khruangbin',
        date: '2026-06-01',
      })
      const unmatched = await seedEvent(venue.id, {
        artist: 'Nobody Here',
        date: '2026-06-02',
      })
      await seedUserEvent(USER_ID, matched.id, {
        status: null,
        attendingAt: ATTENDED,
      })
      await seedUserEvent(USER_ID, unmatched.id, {
        status: null,
        attendingAt: ATTENDED,
      })

      const body = await getHistory()
      // One row per attended night: a fan-out here would mean the join stopped
      // behaving like a lookup.
      expect(body.data.past).toHaveLength(2)
      expect(body.data.past[0]?.artist).toBe('Nobody Here')
      expect(body.data.past[0]?.artistPhotoUrl).toBeNull()
      expect(body.data.past[1]?.artist).toBe('Khruangbin')
      expect(body.data.past[1]?.artistPhotoUrl).toBe(PORTRAIT)
    })

    it('does not borrow the portrait of a different artist', async () => {
      setAuth()
      await seedSupporter()
      const venue = await seedVenue({ slug: 'history-photo-other' })
      await seedArtist({ name: 'Some Opener', photoUrl: PORTRAIT })
      const event = await seedEvent(venue.id, {
        artist: 'Khruangbin',
        date: '2026-06-01',
      })
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: ATTENDED,
      })

      const body = await getHistory()
      expect(body.data.past[0]?.artistPhotoUrl).toBeNull()
    })
  })

  it('excludes a past show the user only watched (Watching is not Attending)', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-06-01' })
    await seedUserEvent(USER_ID, event.id, { status: 'watching' })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(0)
  })

  it('includes a show the user both watched and attended', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-06-01' })
    await seedUserEvent(USER_ID, event.id, {
      status: 'watching',
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(1)
  })

  it('puts a future attended show in upcoming, not past (#1357)', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Still Ahead',
      date: '2099-06-01',
    })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(0)
    expect(body.data.upcoming.map((show) => show.artist)).toEqual([
      'Still Ahead',
    ])
    // Nights, venues and spend are past-tense claims, so an upcoming show
    // cannot inflate them.
    expect(body.data.stats.nights).toBe(0)
  })

  it('drops an upcoming show the crawler stopped seeing but keeps the past one', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const missingUpcoming = await seedEvent(venue.id, {
      artist: 'Delisted Ahead',
      date: '2099-06-01',
      firstMissingAt: new Date('2026-06-04T09:00:00Z'),
    })
    const missingPast = await seedEvent(venue.id, {
      artist: 'Delisted Behind',
      date: '2026-06-01',
      firstMissingAt: new Date('2026-05-04T09:00:00Z'),
    })
    for (const event of [missingUpcoming, missingPast]) {
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: ATTENDED,
      })
    }

    const body = await getHistory()
    expect(body.data.upcoming).toHaveLength(0)
    // A night already attended stays on the record whatever the crawler does.
    expect(body.data.past.map((show) => show.artist)).toEqual([
      'Delisted Behind',
    ])
  })

  it('orders upcoming forwards from the next night', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const later = await seedEvent(venue.id, {
      artist: 'Later',
      date: '2099-09-01',
    })
    const sooner = await seedEvent(venue.id, {
      artist: 'Sooner',
      date: '2099-07-01',
    })
    for (const event of [later, sooner]) {
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: ATTENDED,
      })
    }

    const body = await getHistory()
    expect(body.data.upcoming.map((show) => show.artist)).toEqual([
      'Sooner',
      'Later',
    ])
  })

  it('excludes a cancelled upcoming show', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-06-01',
      status: 'cancelled',
    })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.upcoming).toHaveLength(0)
  })

  it('excludes a cancelled past attended show but keeps a postponed one', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const cancelled = await seedEvent(venue.id, {
      artist: 'Cancelled Show',
      date: '2026-06-01',
      status: 'cancelled',
    })
    const postponed = await seedEvent(venue.id, {
      artist: 'Postponed Show',
      date: '2026-06-02',
      status: 'postponed',
    })
    await seedUserEvent(USER_ID, cancelled.id, {
      status: null,
      attendingAt: ATTENDED,
    })
    await seedUserEvent(USER_ID, postponed.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past.map((show) => show.artist)).toEqual([
      'Postponed Show',
    ])
  })

  it('excludes an event hidden from consumers', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-06-01',
      hiddenFromConsumer: true,
    })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(0)
  })

  it('excludes another user’s attendance', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-06-01' })
    await seedUserEvent('user_someone_else', event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const body = await getHistory()
    expect(body.data.past).toHaveLength(0)
  })

  it('orders past shows reverse-chronologically', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const early = await seedEvent(venue.id, {
      artist: 'Early',
      date: '2026-01-01',
    })
    const middle = await seedEvent(venue.id, {
      artist: 'Middle',
      date: '2026-03-01',
    })
    const late = await seedEvent(venue.id, {
      artist: 'Late',
      date: '2026-06-01',
    })
    for (const event of [early, middle, late]) {
      await seedUserEvent(USER_ID, event.id, {
        status: null,
        attendingAt: ATTENDED,
      })
    }

    const body = await getHistory()
    expect(body.data.past.map((show) => show.artist)).toEqual([
      'Late',
      'Middle',
      'Early',
    ])
  })
})

describe('GET /v1/history/export.ics', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
  })

  it('returns 403 for a plan the matrix denies calendar export', async () => {
    setAuth()
    const res = await app.request('/v1/history/export.ics')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { feature: string }
    expect(body.feature).toBe('calendar-export')
  })

  it('serves a calendar attachment for an entitled user', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue({ name: 'Ogden Theatre', slug: 'ogden' })
    const event = await seedEvent(venue.id, {
      artist: 'Khruangbin',
      date: '2026-06-01',
      showTime: '20:00:00',
    })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: ATTENDED,
    })

    const res = await app.request('/v1/history/export.ics')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/calendar; charset=utf-8')
    expect(res.headers.get('content-disposition')).toContain(
      'concert-crawl-history.ics',
    )

    const text = await res.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('SUMMARY:Khruangbin')
    expect(text).toContain('LOCATION:Ogden Theatre')
    // The 20:00 wall-clock door carries into DTSTART as-is under a TZID.
    expect(text).toContain('DTSTART;TZID=America/Denver:20260601T200000')
    // DTSTAMP is generation time, never derived from the show date.
    expect(text).not.toContain('DTSTAMP:20260601T000000Z')
  })
})
