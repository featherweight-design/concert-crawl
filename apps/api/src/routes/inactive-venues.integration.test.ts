import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedArtist,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'

const app = createApp()

const FUTURE = '2027-09-12'
const PAST = '2020-09-12'

// Parsed rather than cast: an `as` asserts a shape without checking it, so a
// response-shape regression would surface as a confusing assertion failure
// instead of a schema error naming the field that moved.
const artistListSchema = z.object({
  data: z.object({ data: z.array(z.object({ artist: z.string() })) }),
})

const browseSchema = z.object({
  data: z.object({
    data: z.array(z.object({ artist: z.string() })),
    total: z.number(),
  }),
})

const popularSchema = z.object({
  data: z.array(z.object({ artist: z.string() })),
})

const artistDetailSchema = z.object({
  data: z.object({
    shows: z.array(z.unknown()),
    past: z.array(z.unknown()),
  }),
})

/**
 * #1299 — deactivating a venue removes it from every forward-looking surface.
 * `/v1/venues` and `/v1/venues/:slug` already filtered on `active`, so an event
 * still listed for a deactivated venue linked a live listing to a 404 venue.
 */
describe('inactive venues (#1299)', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const seedPair = async () => {
    const live = await seedVenue({
      name: 'Live Venue',
      slug: 'live-venue',
      active: true,
    })
    const dead = await seedVenue({
      name: 'Closed Venue',
      slug: 'closed-venue',
      active: false,
    })
    return { live, dead }
  }

  it('omits inactive-venue events from the browse list and its total', async () => {
    const { live, dead } = await seedPair()
    await seedEvent(live.id, { artist: 'Live Act', date: FUTURE })
    await seedEvent(dead.id, { artist: 'Closed Act', date: FUTURE })

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = browseSchema.parse(await res.json())

    expect(body.data.data.map((row) => row.artist)).toEqual(['Live Act'])
    // The count query is a separate statement from the rows query — a filter
    // applied to only one of them yields a total that disagrees with the page.
    expect(body.data.total).toBe(1)
  })

  it('404s the detail page for an inactive-venue event', async () => {
    const { dead } = await seedPair()
    const event = await seedEvent(dead.id, { date: FUTURE })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(404)
  })

  it('omits inactive-venue events from related events', async () => {
    const { live, dead } = await seedPair()
    const source = await seedEvent(live.id, {
      artist: 'Source Act',
      date: FUTURE,
    })
    await seedEvent(dead.id, { artist: 'Closed Act', date: FUTURE })

    const res = await app.request(`/v1/events/${source.id}/related`)
    expect(res.status).toBe(200)
    const body = artistListSchema.parse(await res.json())

    expect(body.data.data.map((row) => row.artist)).not.toContain('Closed Act')
  })

  it('omits inactive-venue events from popular search results', async () => {
    const { live, dead } = await seedPair()
    const liveEvent = await seedEvent(live.id, {
      artist: 'Live Act',
      date: FUTURE,
    })
    const deadEvent = await seedEvent(dead.id, {
      artist: 'Closed Act',
      date: FUTURE,
    })

    // The closed venue's show is the more popular one, so a missing filter
    // would put it first rather than merely include it.
    await seedUserEvent('user-1', deadEvent.id, { status: 'watching' })
    await seedUserEvent('user-2', deadEvent.id, { status: 'watching' })
    await seedUserEvent('user-3', liveEvent.id, { status: 'watching' })

    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
    const body = popularSchema.parse(await res.json())

    expect(body.data.map((row) => row.artist)).toEqual(['Live Act'])
  })

  it('drops upcoming shows but keeps past shows on the artist page', async () => {
    const { dead } = await seedPair()
    await seedArtist({ name: 'Closed Act' })
    await seedEvent(dead.id, { artist: 'Closed Act', date: FUTURE })
    await seedEvent(dead.id, { artist: 'Closed Act', date: PAST })

    const res = await app.request('/v1/artists/closed-act')
    expect(res.status).toBe(200)
    const body = artistDetailSchema.parse(await res.json())

    expect(body.data.shows).toHaveLength(0)
    // Deactivation is forward-looking only — it does not un-happen the shows
    // the venue already hosted.
    expect(body.data.past).toHaveLength(1)
  })
})
