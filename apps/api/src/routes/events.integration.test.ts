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
})

describe('GET /v1/events/:id — integration', () => {
  beforeEach(async () => {
    await clearTables()
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

  it('returns 400 for an invalid filterVibe value', async () => {
    const res = await app.request('/v1/events?filterVibe=reggae')
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
      vi.resetModules()
    }
  })
})
