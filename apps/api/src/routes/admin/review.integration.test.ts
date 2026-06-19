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

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedVenue,
} from '../../test/helpers/seed.js'

const app = createApp()

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

const NON_ADMIN_HEADERS = {
  Authorization: 'Bearer fan-token',
  'Content-Type': 'application/json',
}

const setAdminAuth = () => {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const setNonAdminAuth = () => {
  authState.current = {
    userId: 'fan_user',
    sessionClaims: { metadata: { role: 'user' } },
  }
}

const clearAuth = () => {
  authState.current = null
}

describe('GET /v1/admin/review/counts', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns { eventFlags, prices, missing } in the expected shape', async () => {
    const venue = await seedVenue()
    // 2 unverified events — eventFlags should be 2
    await seedEvent(venue.id, {
      artist: 'Unverified 1',
      date: '2099-09-01',
      verified: false,
    })
    await seedEvent(venue.id, {
      artist: 'Unverified 2',
      date: '2099-09-02',
      verified: false,
    })
    // 1 verified event — does not count toward eventFlags
    const verified = await seedEvent(venue.id, {
      artist: 'Verified',
      date: '2099-09-03',
      verified: true,
    })
    // 1 pending price submission — prices should be 1
    await seedPriceSubmission(verified.id, 'user-a', { status: 'pending' })
    // 1 corroborated submission — does not count toward prices
    await seedPriceSubmission(verified.id, 'user-b', {
      status: 'corroborated',
    })
    // 1 missing event (firstMissingAt + upcoming + future date) — missing should be 1
    await seedEvent(venue.id, {
      artist: 'Missing',
      date: '2099-09-04',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2099-08-01T00:00:00Z'),
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { eventFlags: number; prices: number; missing: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.eventFlags).toBe(2)
    expect(body.data.prices).toBe(1)
    expect(body.data.missing).toBe(1)
  })

  it('excludes past-dated missing events from the missing count', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Past Missing',
      date: '2020-01-01',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2019-12-01T00:00:00Z'),
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { missing: number }
    }
    expect(body.data.missing).toBe(0)
  })

  it('returns 403 for non-admin callers', async () => {
    setNonAdminAuth()
    const res = await app.request('/v1/admin/review/counts', {
      headers: NON_ADMIN_HEADERS,
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    clearAuth()
    const res = await app.request('/v1/admin/review/counts')
    expect(res.status).toBe(401)
  })
})
