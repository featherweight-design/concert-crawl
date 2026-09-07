import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

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

import { eq } from 'drizzle-orm'
import { userEvents } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
  seedPriceSubmission,
  seedArtist,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_watch_test'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

// Used by the provenance tests below. The rest of this file still casts, which
// is why these parse instead: a cast turns a 500 or a renamed field into
// `undefined`, which quietly satisfies an assertion expecting null.
const provenanceResponse = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      currentPrice: z.number().nullable(),
      priceSourceCategory: z
        .enum(['boxoffice', 'standard', 'resale'])
        .nullable(),
    }),
  ),
})

async function readProvenance(
  res: Response,
): Promise<z.infer<typeof provenanceResponse>> {
  expect(res.status).toBe(200)
  return provenanceResponse.parse(await res.json())
}

// Parsed rather than cast for the same reason as the schemas above: a cast
// turns a 500 into an empty `data` and lets a "row is excluded" assertion pass
// for the wrong reason.
const artistListResponse = z.object({
  success: z.boolean(),
  data: z.array(z.object({ artist: z.string() })),
})

// The toggle response feeds the follow nudge (PR 10), which keys its one-time
// dismissal on `userEventId`. Parsed rather than cast: a missing field must
// fail the test, not arrive as `undefined` and satisfy a loose assertion.
const toggleResponse = z.object({
  success: z.boolean(),
  data: z.object({
    watching: z.boolean(),
    savedPrice: z.number().nullable(),
    userEventId: z.string().nullable(),
    artist: z.string().nullable(),
    artistSlug: z.string().nullable(),
  }),
})

async function readToggle(
  res: Response,
): Promise<z.infer<typeof toggleResponse>> {
  expect(res.status).toBe(200)
  return toggleResponse.parse(await res.json())
}

describe('GET /v1/watching', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/watching')
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty array when authenticated with no watched shows', async () => {
    setAuth()
    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('returns watched upcoming shows after watching an event', async () => {
    setAuth('user_abc')
    const venue = await seedVenue({ name: 'Red Rocks', slug: 'red-rocks' })
    // Use a future date so the event shows up in GET /v1/watching
    const event = await seedEvent(venue.id, {
      artist: 'Radiohead',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-15',
      status: 'upcoming',
    })
    await seedUserEvent('user_abc', event.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        eventId: string
        artist: string
        venueName: string
        venueSlug: string
      }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.eventId).toBe(event.id)
    expect(body.data[0]?.artist).toBe('Radiohead')
    expect(body.data[0]?.venueName).toBe('Red Rocks')
    expect(body.data[0]?.venueSlug).toBe('red-rocks')
  })

  it('returns watchStatus: live (not presale) for on-sale events with no price data', async () => {
    setAuth('user_noprice')
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' })
    const event = await seedEvent(venue.id, {
      artist: 'Wilco',
      supportingArtists: null,
      tourName: null,
      date: '2099-08-01',
      status: 'upcoming',
      ticketPriceMin: null,
      priceSource: null,
    })
    await seedUserEvent('user_noprice', event.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { watchStatus: string; currentPrice: number | null }[]
    }
    expect(body.success).toBe(true)
    expect(body.data[0]?.watchStatus).toBe('live')
    expect(body.data[0]?.currentPrice).toBeNull()
  })

  // #1365 — Watching read events.ticketPriceMin, which holds whatever price
  // was written last rather than the cheapest tier, so it quoted the Reserved
  // price while the event page quoted the GA floor.
  it('quotes the cheapest tier, not the denormalized ticketPriceMin scalar', async () => {
    setAuth('user_lowest')
    const venue = await seedVenue({ name: 'Mission', slug: 'mission' })
    const event = await seedEvent(venue.id, {
      artist: 'Hermanos Gutiérrez',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-03',
      status: 'upcoming',
      ticketPriceMin: '125.00',
      priceSource: 'community',
    })
    await seedPriceSubmission(event.id, 'user_a', {
      tier: 'Reserved',
      priceMin: '125',
      vendor: 'AXS',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user_b', {
      tier: 'GA',
      priceMin: '68',
      vendor: 'AXS',
      status: 'corroborated',
    })
    await seedUserEvent('user_lowest', event.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { currentPrice: number | null }[]
    }
    expect(body.data[0]?.currentPrice).toBe(68)
  })

  // The provenance chip has to describe the price rendered beside it. This
  // route used to read the price off the corroborated headline but the
  // provenance off events.priceSource — the crawler's origin for a different
  // price — so a box-office headline could render as "community", or as
  // nothing at all. Same class as #1364/#1365/#1366, which fixed the price and
  // the staleness timestamp and left provenance behind.
  it('reports the headline price category, not the event scalar price source', async () => {
    setAuth('user_provenance')
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' })
    const event = await seedEvent(venue.id, {
      artist: 'Jeff Rosenstock',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-04',
      status: 'upcoming',
      ticketPriceMin: '125.00',
      // The scalar disagrees with the corroborated headline on purpose.
      priceSource: 'seatgeek',
    })
    await seedPriceSubmission(event.id, 'user_a', {
      tier: 'Reserved',
      priceMin: '125',
      sourceCategory: 'resale',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user_b', {
      tier: 'GA',
      priceMin: '68',
      sourceCategory: 'boxoffice',
      status: 'corroborated',
    })
    await seedUserEvent('user_provenance', event.id, { status: 'watching' })

    const body = await readProvenance(await app.request('/v1/watching'))
    // boxoffice was unrepresentable before this: mapSourceKind had no branch
    // for it, so the venue's own price claimed to be a fan submission.
    expect(body.data[0]?.currentPrice).toBe(68)
    expect(body.data[0]?.priceSourceCategory).toBe('boxoffice')
  })

  it('reports a null category for a crawled price with no submissions', async () => {
    setAuth('user_crawled')
    const venue = await seedVenue({ name: 'Marquis', slug: 'marquis' })
    const event = await seedEvent(venue.id, {
      artist: 'Militarie Gun',
      supportingArtists: null,
      tourName: null,
      date: '2099-11-05',
      status: 'upcoming',
      ticketPriceMin: '22.00',
      priceSource: 'structured_data',
    })
    await seedUserEvent('user_crawled', event.id, { status: 'watching' })

    const body = await readProvenance(await app.request('/v1/watching'))
    // Null is the handoff's `primary`: a crawled price renders no chip.
    expect(body.data[0]?.priceSourceCategory).toBeNull()
  })

  it('falls back to ticketPriceMin when no corroborated submissions exist', async () => {
    setAuth('user_fallback')
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })
    const event = await seedEvent(venue.id, {
      artist: 'Khruangbin',
      supportingArtists: null,
      tourName: null,
      date: '2099-11-02',
      status: 'upcoming',
      ticketPriceMin: '45.00',
      priceSource: 'structured_data',
    })
    await seedUserEvent('user_fallback', event.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    const body = (await res.json()) as {
      success: boolean
      data: { currentPrice: number | null }[]
    }
    expect(body.data[0]?.currentPrice).toBe(45)
  })

  it('returns shows sorted ascending by date then showTime', async () => {
    setAuth('user_sort')
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' })
    const eventLate = await seedEvent(venue.id, {
      artist: 'Late Show',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      showTime: '21:00:00',
    })
    const eventEarly = await seedEvent(venue.id, {
      artist: 'Early Show',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      showTime: '18:00:00',
    })
    const eventNextDay = await seedEvent(venue.id, {
      artist: 'Next Day',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
      showTime: '20:00:00',
    })
    await seedUserEvent('user_sort', eventLate.id, { status: 'watching' })
    await seedUserEvent('user_sort', eventEarly.id, { status: 'watching' })
    await seedUserEvent('user_sort', eventNextDay.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { artist: string }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(3)
    expect(body.data[0]?.artist).toBe('Early Show')
    expect(body.data[1]?.artist).toBe('Late Show')
    expect(body.data[2]?.artist).toBe('Next Day')
  })

  it('excludes events flagged hiddenFromConsumer=true (PR 6)', async () => {
    setAuth('user_hidden')
    const venue = await seedVenue()
    const visibleEvent = await seedEvent(venue.id, {
      artist: 'Visible Show',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
    })
    const hiddenEvent = await seedEvent(venue.id, {
      artist: 'Hidden Show',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
      hiddenFromConsumer: true,
    })
    await seedUserEvent('user_hidden', visibleEvent.id, { status: 'watching' })
    await seedUserEvent('user_hidden', hiddenEvent.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    const body = (await res.json()) as {
      data: { artist: string }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.artist).toBe('Visible Show')
  })

  it('excludes events the crawler stopped seeing (firstMissingAt set)', async () => {
    setAuth('user_missing')
    const venue = await seedVenue()
    const listedEvent = await seedEvent(venue.id, {
      artist: 'Still Listed',
      date: '2099-09-01',
    })
    const missingEvent = await seedEvent(venue.id, {
      artist: 'Delisted Show',
      date: '2099-09-02',
      firstMissingAt: new Date('2099-08-01T09:00:00Z'),
    })
    await seedUserEvent('user_missing', listedEvent.id, { status: 'watching' })
    await seedUserEvent('user_missing', missingEvent.id, { status: 'watching' })

    const res = await app.request('/v1/watching')
    expect(res.status).toBe(200)
    const body = artistListResponse.parse(await res.json())
    expect(body.data.map((show) => show.artist)).toEqual(['Still Listed'])
  })

  // The headliner portrait, second link in the imagery chain behind the event's
  // own artwork. Browse joins `artists` for it; this list did not, so the same
  // show wore a real face there and a generated glyph here.
  describe('the artistPhotoUrl join', () => {
    const PORTRAIT = 'https://i.scdn.co/image/headliner'

    const photoResponse = z.object({
      data: z.array(
        z.object({
          artist: z.string(),
          imageUrl: z.string().nullable(),
          artistPhotoUrl: z.string().nullable(),
        }),
      ),
    })

    const readPhotos = async (): Promise<z.infer<typeof photoResponse>> => {
      const res = await app.request('/v1/watching')
      expect(res.status).toBe(200)
      return photoResponse.parse(await res.json())
    }

    it('serializes the portrait, and null when nothing matches', async () => {
      setAuth('user_photo')
      const venue = await seedVenue({ slug: 'watching-photo' })
      await seedArtist({ name: 'Khruangbin', photoUrl: PORTRAIT })
      const matched = await seedEvent(venue.id, {
        artist: 'Khruangbin',
        date: '2099-09-01',
        imageUrl: null,
      })
      const unmatched = await seedEvent(venue.id, {
        artist: 'Nobody Here',
        date: '2099-09-02',
      })
      await seedUserEvent('user_photo', matched.id, { status: 'watching' })
      await seedUserEvent('user_photo', unmatched.id, { status: 'watching' })

      const body = await readPhotos()
      // One row per watch: a fan-out here would mean the join stopped behaving
      // like a lookup.
      expect(body.data).toHaveLength(2)
      expect(body.data[0]).toEqual({
        artist: 'Khruangbin',
        imageUrl: null,
        artistPhotoUrl: PORTRAIT,
      })
      expect(body.data[1]?.artistPhotoUrl).toBeNull()
    })

    it('does not borrow the portrait of a different artist', async () => {
      setAuth('user_photo_other')
      const venue = await seedVenue({ slug: 'watching-photo-other' })
      await seedArtist({ name: 'Some Opener', photoUrl: PORTRAIT })
      const event = await seedEvent(venue.id, {
        artist: 'Khruangbin',
        date: '2099-09-01',
      })
      await seedUserEvent('user_photo_other', event.id, { status: 'watching' })

      expect((await readPhotos()).data[0]?.artistPhotoUrl).toBeNull()
    })
  })
})

describe('PUT /v1/watching/:eventId', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/watching/some-event-id', {
      method: 'PUT',
    })
    expect(res.status).toBe(401)
  })

  it('watches an event and returns watching=true', async () => {
    setAuth('user_toggle')
    const venue = await seedVenue({ name: 'Fillmore', slug: 'fillmore' })
    const event = await seedEvent(venue.id, {
      artist: 'Pearl Jam',
      supportingArtists: null,
      tourName: null,
      date: '2099-08-01',
      ticketPriceMin: '75.00',
    })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { watching: boolean; savedPrice: number | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.watching).toBe(true)
    expect(body.data.savedPrice).toBe(75)
  })

  it('toggles off an already-watched event and returns watching=false', async () => {
    setAuth('user_toggle2')
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })
    const event = await seedEvent(venue.id, {
      artist: 'The Strokes',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
    })
    await seedUserEvent('user_toggle2', event.id, { status: 'watching' })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { watching: boolean; savedPrice: number | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.watching).toBe(false)
    expect(body.data.savedPrice).toBeNull()
  })

  it('returns 404 for a non-existent event', async () => {
    setAuth('user_404')
    const nonExistentId = '00000000-0000-0000-0000-000000000001'
    const res = await app.request(`/v1/watching/${nonExistentId}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 when watching an event the crawler stopped seeing', async () => {
    setAuth('user_watch_missing')
    const venue = await seedVenue({ name: 'Mission', slug: 'mission' })
    const event = await seedEvent(venue.id, {
      artist: 'Delisted Show',
      date: '2099-09-03',
      firstMissingAt: new Date('2099-08-01T09:00:00Z'),
    })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(404)
  })

  it('still un-watches an event the crawler stopped seeing', async () => {
    setAuth('user_unwatch_missing')
    const venue = await seedVenue({ name: 'Mission', slug: 'mission' })
    const event = await seedEvent(venue.id, {
      artist: 'Delisted Show',
      date: '2099-09-04',
      firstMissingAt: new Date('2099-08-01T09:00:00Z'),
    })
    await seedUserEvent('user_unwatch_missing', event.id, {
      status: 'watching',
    })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)
    const body = toggleResponse.parse(await res.json())
    expect(body.data.watching).toBe(false)
  })

  it('keeps the row when un-watching a show the user is also attending', async () => {
    setAuth('user_attend_keep')
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' })
    const event = await seedEvent(venue.id, {
      artist: 'Khruangbin',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
    })
    await seedUserEvent('user_attend_keep', event.id, {
      status: 'watching',
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, 'user_attend_keep'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBeNull()
    expect(rows[0]?.attendingAt).not.toBeNull()
  })

  it('deletes the row when un-watching a show with no attendance', async () => {
    setAuth('user_attend_none')
    const venue = await seedVenue({ name: 'Marquis', slug: 'marquis' })
    const event = await seedEvent(venue.id, {
      artist: 'Turnstile',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-03',
    })
    await seedUserEvent('user_attend_none', event.id, { status: 'watching' })

    await app.request(`/v1/watching/${event.id}`, { method: 'PUT' })

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, 'user_attend_none'))
    expect(rows).toHaveLength(0)
  })

  it('preserves attendingAt when watching an attending-only row', async () => {
    setAuth('user_rewatch')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })
    const event = await seedEvent(venue.id, {
      artist: 'Idles',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-04',
      ticketPriceMin: '40.00',
    })
    await seedUserEvent('user_rewatch', event.id, {
      status: null,
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/watching/${event.id}`, {
      method: 'PUT',
    })
    const body = (await res.json()) as { data: { watching: boolean } }
    expect(body.data.watching).toBe(true)

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, 'user_rewatch'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('watching')
    expect(rows[0]?.attendingAt).not.toBeNull()
  })

  // --- Follow-nudge payload (PR 10) ---

  it('returns the row id and the headliner when watching on', async () => {
    setAuth('user_nudge_payload')
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' })
    await seedArtist({ name: 'Wednesday' })
    const event = await seedEvent(venue.id, {
      artist: 'Wednesday',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-01',
    })

    const body = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )
    expect(body.data.watching).toBe(true)
    expect(body.data.artist).toBe('Wednesday')
    expect(body.data.artistSlug).toBe('wednesday')

    const rows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, 'user_nudge_payload'))
    expect(body.data.userEventId).toBe(rows[0]?.id)
  })

  it('returns a null artistSlug when the projection has no row', async () => {
    setAuth('user_nudge_noslug')
    const venue = await seedVenue({ name: 'Hi-Dive', slug: 'hi-dive' })
    const event = await seedEvent(venue.id, {
      artist: 'Nobody In The Projection',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-02',
    })

    const body = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )
    expect(body.data.artist).toBe('Nobody In The Projection')
    expect(body.data.artistSlug).toBeNull()
  })

  it('nulls the nudge payload when un-watching', async () => {
    setAuth('user_nudge_off')
    const venue = await seedVenue({ name: 'Larimer', slug: 'larimer' })
    const event = await seedEvent(venue.id, {
      artist: 'Slowdive',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-03',
    })
    await seedUserEvent('user_nudge_off', event.id, { status: 'watching' })

    const body = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )
    expect(body.data.watching).toBe(false)
    expect(body.data.userEventId).toBeNull()
    expect(body.data.artist).toBeNull()
    expect(body.data.artistSlug).toBeNull()
  })

  // ⚠️ REGRESSION (#70 class). The nudge's dismissal is keyed on
  // `userEventId`, so un-watching and re-watching MUST mint a new id —
  // otherwise a dismissal taken on the first watch silences the nudge forever
  // and the whole cycle is untestable from the client.
  it('mints a new userEventId across un-watch then re-watch', async () => {
    setAuth('user_nudge_cycle')
    const venue = await seedVenue({ name: 'Meadowlark', slug: 'meadowlark' })
    const event = await seedEvent(venue.id, {
      artist: 'Big Thief',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-04',
    })

    const first = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )
    await app.request(`/v1/watching/${event.id}`, { method: 'PUT' })
    const second = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )

    expect(first.data.userEventId).not.toBeNull()
    expect(second.data.userEventId).not.toBe(first.data.userEventId)
  })

  // The deliberate exception: an attending row survives `releaseWatch`, so its
  // id survives too and the dismissal legitimately persists. Asserted so the
  // divergence is a decision on the record rather than a surprise later.
  it('keeps the userEventId across a re-watch when the user is also attending', async () => {
    setAuth('user_nudge_attend')
    const venue = await seedVenue({ name: 'Cervantes', slug: 'cervantes' })
    const event = await seedEvent(venue.id, {
      artist: 'Fontaines D.C.',
      supportingArtists: null,
      tourName: null,
      date: '2099-10-05',
    })
    await seedUserEvent('user_nudge_attend', event.id, {
      status: 'watching',
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const before = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, 'user_nudge_attend'))
    await app.request(`/v1/watching/${event.id}`, { method: 'PUT' })
    const after = await readToggle(
      await app.request(`/v1/watching/${event.id}`, { method: 'PUT' }),
    )

    expect(after.data.userEventId).toBe(before[0]?.id)
  })
})
