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
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedEvent,
  seedVenue,
  seedPriceSubmission,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_abc123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('POST /v1/events/:id/price-submissions', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  it('returns 401 without auth', async () => {
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceMin: 25 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a pending submission', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ priceMin: 35, priceMax: 65, tierLabel: 'GA' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { status: string; priceMin: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('pending')
    expect(parseFloat(body.data.priceMin)).toBe(35)
  })

  it('returns 422 when priceMin is missing', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ priceMax: 65 }),
    })
    expect(res.status).toBe(422)
  })
})

describe('GET /v1/events/:id/price-submissions', () => {
  it('returns corroborated submissions for an event', async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_1', {
      status: 'corroborated',
      priceMin: '40',
    })

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ status: string }>
    }
    expect(body.success).toBe(true)
    expect(body.data[0]?.status).toBe('corroborated')
  })
})
