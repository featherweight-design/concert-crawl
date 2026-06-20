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

const TEST_BODY = {
  priceMin: 35,
  tier: 'GA',
  vendor: 'Ticketmaster',
  howFound: 'bought_myself',
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
      body: JSON.stringify(TEST_BODY),
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
      body: JSON.stringify({ ...TEST_BODY, priceMax: 65 }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        status: string
        priceMin: string
        tier: string
        corroborationCount: number
        sourceCategory: string | null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('pending')
    expect(parseFloat(body.data.priceMin)).toBe(35)
    expect(body.data.tier).toBe('GA')
    // Submitter counts as observation #1 in the 1/2 model
    expect(body.data.corroborationCount).toBe(1)
    // sourceCategory is optional during the expand phase — omitted in TEST_BODY
    expect(body.data.sourceCategory).toBeNull()
  })

  it('persists sourceCategory when provided and returns it on GET', async () => {
    setAuth()
    const postRes = await app.request(
      `/v1/events/${eventId}/price-submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          priceMin: 25,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'at_the_venue',
          sourceCategory: 'boxoffice',
        }),
      },
    )
    expect(postRes.status).toBe(201)
    const postBody = (await postRes.json()) as {
      success: boolean
      data: { sourceCategory: string; corroborationCount: number }
    }
    expect(postBody.data.sourceCategory).toBe('boxoffice')
    expect(postBody.data.corroborationCount).toBe(1)

    const getRes = await app.request(
      `/v1/events/${eventId}/price-submissions`,
      { headers: { Authorization: 'Bearer test-token' } },
    )
    const getBody = (await getRes.json()) as {
      data: {
        submissions: Array<{
          userId: string
          sourceCategory: string | null
          corroborationCount: number
        }>
      }
    }
    const ourRow = getBody.data.submissions.find(
      (sub) => sub.userId === 'user_abc123',
    )
    expect(ourRow?.sourceCategory).toBe('boxoffice')
    expect(ourRow?.corroborationCount).toBe(1)
  })

  it('returns 422 when sourceCategory is not one of the enum values', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ ...TEST_BODY, sourceCategory: 'invalid' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 when required fields are missing', async () => {
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

  it('returns 409 when user already has a pending submission', async () => {
    setAuth()
    await seedPriceSubmission(eventId, 'user_abc123')
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(409)
  })

  it('returns 429 when user submits within 24h (non-pending submission exists)', async () => {
    setAuth()
    await seedPriceSubmission(eventId, 'user_abc123', {
      status: 'corroborated',
    })
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(429)
  })
})

describe('GET /v1/events/:id/price-submissions', () => {
  it('returns submissions with enriched shape', async () => {
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
      data: {
        submissions: Array<{ status: string; confirms: number; byYou: boolean }>
        alreadySubmitted: boolean
        userSubmission: null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.submissions[0]?.status).toBe('corroborated')
    expect(typeof body.data.submissions[0]?.confirms).toBe('number')
    expect(body.data.alreadySubmitted).toBe(false)
    expect(body.data.userSubmission).toBeNull()
  })

  it('filters out stale submissions', async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_1', { status: 'stale' })

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as {
      success: boolean
      data: { submissions: Array<unknown> }
    }
    expect(body.success).toBe(true)
    expect(body.data.submissions).toHaveLength(0)
  })
})

describe('GET /v1/events/:id/price-submissions — beta auth gate', () => {
  it('returns 401 without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { priceSubmissionsRouter: freshRouter } =
        await import('./price-submissions.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request(
        '/v1/events/00000000-0000-0000-0000-000000000001/price-submissions',
      )
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })
})
