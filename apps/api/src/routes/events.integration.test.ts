import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/events — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty list when no events exist', async () => {
    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number; limit: number; offset: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.data).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  it('returns events with joined venue data', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    await seedEvent(venue.id, { title: 'Rock Night', date: '2027-06-01' })

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        data: { title: string; venue: { name: string } }[]
        total: number
      }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
    expect(body.data.data[0]?.venue.name).toBe('Globe Hall')
  })

  it('filters by venueSlug', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' })
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' })
    await seedEvent(venueA.id, { title: 'Show at A', date: '2027-06-01' })
    await seedEvent(venueB.id, { title: 'Show at B', date: '2027-06-01' })

    const res = await app.request('/v1/events?venueSlug=venue-a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Show at A')
  })

  it('filters by from date', async () => {
    const venue = await seedVenue({
      name: 'The Bluebird',
      slug: 'the-bluebird',
    })
    await seedEvent(venue.id, { title: 'Early Show', date: '2027-01-01' })
    await seedEvent(venue.id, { title: 'Late Show', date: '2027-12-01' })

    const res = await app.request('/v1/events?from=2027-06-01')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Late Show')
  })

  it('excludes events with hiddenFromConsumer=true (PR 6)', async () => {
    const venue = await seedVenue({ name: 'Test', slug: 'test-pr6' })
    await seedEvent(venue.id, {
      title: 'Visible Concert',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Hidden Non-Concert',
      artist: 'Other Artist',
      date: '2027-06-02',
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/events')
    const body = (await res.json()) as {
      data: { data: { title: string }[] }
    }
    const titles = body.data.data.map((row) => row.title)
    expect(titles).toContain('Visible Concert')
    expect(titles).not.toContain('Hidden Non-Concert')
  })

  it('respects limit parameter', async () => {
    const venue = await seedVenue({
      name: 'Ogden Theatre',
      slug: 'ogden-theatre',
    })
    await seedEvent(venue.id, { title: 'Show 1', date: '2027-06-01' })
    await seedEvent(venue.id, { title: 'Show 2', date: '2027-07-01' })
    await seedEvent(venue.id, { title: 'Show 3', date: '2027-08-01' })

    const res = await app.request('/v1/events?limit=2')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number; limit: number }
    }
    expect(body.data.data).toHaveLength(2)
    expect(body.data.total).toBeGreaterThanOrEqual(3)
    expect(body.data.limit).toBe(2)
  })

  it('excludes rows with first_missing_at set so stale dupes do not leak to consumers', async () => {
    // Regression for the BASS BINGO / Olivia Rodrigo duplicate-display issue
    // observed 2026-06-18. The crawler's stale-detection pass flags rows the
    // LLM no longer extracts (firstMissingAt set) but the consumer list used
    // to ignore that flag, producing N visible rows for one physical show
    // whenever the LLM extracted a different "primary artist" string across
    // crawls. See PR for hide-missing-events-from-consumer-api.
    const venue = await seedVenue({
      name: 'Hide Missing Venue',
      slug: 'hide-missing-venue',
    })
    await seedEvent(venue.id, {
      title: 'Active Show',
      artist: 'Active Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale Show',
      artist: 'Stale Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request('/v1/events?venueSlug=hide-missing-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(1)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Active Show')
  })
})

describe('GET /v1/events/:id — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('404s when the event is hidden from consumers (PR 6)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'Hidden Detail',
      date: '2027-06-01',
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(404)
  })

  it('includes priceSource in event detail response', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      priceSource: 'ticketmaster',
      ticketPriceMin: '45',
      ticketPriceMax: '90',
      date: '2027-06-01',
    })

    const eventsRes = await app.request('/v1/events')
    const listBody = (await eventsRes.json()) as {
      success: boolean
      data: { data: Array<{ id: string }> }
    }
    const eventId = listBody.data.data[0]?.id
    expect(eventId).toBeDefined()

    const res = await app.request(`/v1/events/${eventId}`)
    const body = (await res.json()) as {
      success: boolean
      data: { priceSource: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.priceSource).toBe('ticketmaster')
  })

  it('returns event with venue data', async () => {
    const venue = await seedVenue({
      name: 'Fillmore Auditorium',
      slug: 'fillmore-auditorium',
    })
    const event = await seedEvent(venue.id, {
      title: 'Jazz Festival',
      date: '2027-06-01',
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; venue: { name: string } }
    }
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Jazz Festival')
    expect(body.data.venue.name).toBe('Fillmore Auditorium')
  })

  it('returns 404 for unknown event id', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('returns 404 when the event is flagged first_missing_at so direct-link traffic does not see stale data', async () => {
    const venue = await seedVenue({
      name: 'Detail Missing Venue',
      slug: 'detail-missing-venue',
    })
    const evt = await seedEvent(venue.id, {
      title: 'Stale Detail',
      artist: 'Stale Detail Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request(`/v1/events/${evt.id}`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })
})

describe('GET /v1/events — filterPrice', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('under-25 returns only events with price < 25', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Show',
      ticketPriceMin: '15',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pricey Show',
      ticketPriceMin: '60',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'No Price',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=under-25')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Show')
  })

  it('25-50 returns events with 25 <= price < 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Low Show',
      ticketPriceMin: '10',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Mid Show',
      ticketPriceMin: '35',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Boundary Show',
      ticketPriceMin: '25',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 4',
      title: 'High Show',
      ticketPriceMin: '75',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=25-50')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Mid Show'])
  })

  it('50-plus returns events with price >= 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Show',
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Boundary Show',
      ticketPriceMin: '50',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Pricey Show',
      ticketPriceMin: '120',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=50-plus')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Pricey Show'])
  })

  it('tbd returns only events with no price data', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Priced Show',
      ticketPriceMin: '45',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'TBD Show',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=tbd')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('TBD Show')
  })

  it('returns 400 for an invalid filterPrice value', async () => {
    const res = await app.request('/v1/events?filterPrice=invalid')
    expect(res.status).toBe(400)
  })
})

describe('GET /v1/events — search', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('searches by venue name', async () => {
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
    })
    await seedEvent(venue.id, {
      title: 'Rock Night',
      artist: 'Test Band',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?search=Bluebird')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
    expect(body.data.total).toBe(1)
  })
})

describe('GET /v1/events — filterVibe', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns only events whose genre array contains the selected vibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Rock Night',
      genre: ['rock', 'indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Jazz Evening',
      genre: ['jazz'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'No Genre',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterVibe=rock')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
  })

  it('matches events that have the vibe among multiple genres', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Indie Rock Show',
      genre: ['indie', 'rock'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pure Indie',
      genre: ['indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Pop Show',
      genre: ['pop'],
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterVibe=indie')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Indie Rock Show', 'Pure Indie'])
  })

  it('returns 400 for a filterVibe value exceeding 100 characters', async () => {
    const longGenre = 'a'.repeat(101)
    const res = await app.request(`/v1/events?filterVibe=${longGenre}`)
    expect(res.status).toBe(400)
  })

  it('combines filterPrice and filterVibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Rock',
      genre: ['rock'],
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pricey Rock',
      genre: ['rock'],
      ticketPriceMin: '80',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Cheap Jazz',
      genre: ['jazz'],
      ticketPriceMin: '15',
      date: '2027-06-01',
    })

    const res = await app.request(
      '/v1/events?filterVibe=rock&filterPrice=under-25',
    )
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Rock')
  })
})

describe('GET /v1/events — beta auth gate', () => {
  it('returns 401 without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request('/v1/events')
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })

  it('returns 401 on GET /:id without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request(
        '/v1/events/00000000-0000-0000-0000-000000000001',
      )
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })

  it('returns 401 on GET /genres without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request('/v1/events/genres')
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })
})

describe('GET /v1/events/genres', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty array when no upcoming events exist', async () => {
    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns distinct genres from upcoming events sorted alphabetically', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist One',
      genre: ['rock', 'indie'],
      status: 'upcoming',
    })
    await seedEvent(venue.id, {
      artist: 'Artist Two',
      genre: ['r&b', 'rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).toEqual(['indie', 'r&b', 'rock'])
  })

  it('excludes genres from non-upcoming events', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Jazz Act',
      genre: ['jazz'],
      status: 'cancelled',
    })
    await seedEvent(venue.id, {
      artist: 'Rock Act',
      genre: ['rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).toEqual(['rock'])
  })

  it('omits genres that only appear on first_missing_at rows', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Stale Genre Artist',
      genre: ['ghost-genre-do-not-show'],
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })
    await seedEvent(venue.id, {
      artist: 'Active Genre Artist',
      genre: ['rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).not.toContain('ghost-genre-do-not-show')
    expect(body.data).toContain('rock')
  })
})
