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
