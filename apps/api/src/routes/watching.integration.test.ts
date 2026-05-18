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

import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
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

  it('returns shows sorted ascending by date then showTime', async () => {
    setAuth('user_sort')
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' })
    const eventLate = await seedEvent(venue.id, {
      artist: 'Late Show',
      date: '2099-09-01',
      showTime: '21:00:00',
    })
    const eventEarly = await seedEvent(venue.id, {
      artist: 'Early Show',
      date: '2099-09-01',
      showTime: '18:00:00',
    })
    const eventNextDay = await seedEvent(venue.id, {
      artist: 'Next Day',
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
})
