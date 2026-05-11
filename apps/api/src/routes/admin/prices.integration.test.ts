import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { userRoles } from '@concert-crawl/db'

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

// Prevent the async price pipeline from escaping into adjacent tests and
// causing TRUNCATE/INSERT deadlocks. The pipeline's correctness is covered
// by packages/price-pipeline unit tests.
vi.mock('@concert-crawl/price-pipeline', () => ({
  runPricePipeline: vi.fn().mockResolvedValue(undefined),
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserRole,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'

const app = createApp()

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

describe('GET /v1/admin/prices/health', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns pipeline health stats', async () => {
    const res = await app.request('/v1/admin/prices/health', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { stats: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.stats)).toBe(true)
  })
})

describe('GET /v1/admin/prices/log', () => {
  beforeEach(() => {
    setAdminAuth()
  })

  it('returns last retrieval attempts', async () => {
    const res = await app.request('/v1/admin/prices/log', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /v1/admin/prices/pipeline/:eventId', () => {
  beforeEach(() => {
    setAdminAuth()
  })

  it('returns 202 and starts pipeline for existing event', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/prices/pipeline/${event.id}`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(202)
    const body = (await res.json()) as {
      success: boolean
      data: { eventId: string }
    }
    expect(body.data.eventId).toBe(event.id)
  })

  it('returns 404 for unknown event', async () => {
    const res = await app.request(
      '/v1/admin/prices/pipeline/00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
      },
    )
    expect(res.status).toBe(404)
  })
})

describe('PATCH /v1/admin/prices/submissions/:id', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('increments priceCredScore when transitioning pending → corroborated', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const userId = 'user_cred_test'
    await seedUserRole(userId)
    const submission = await seedPriceSubmission(event.id, userId)

    const res = await app.request(`/v1/admin/prices/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'corroborated' }),
    })
    expect(res.status).toBe(200)

    const [role] = await testDb
      .select({ priceCredScore: userRoles.priceCredScore })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1)
    expect(role?.priceCredScore).toBe(1)
  })

  it('does not double-increment when status is already corroborated', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const userId = 'user_no_double'
    await seedUserRole(userId)
    const submission = await seedPriceSubmission(event.id, userId, {
      status: 'corroborated',
    })

    const res = await app.request(`/v1/admin/prices/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'corroborated' }),
    })
    expect(res.status).toBe(200)

    const [role] = await testDb
      .select({ priceCredScore: userRoles.priceCredScore })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1)
    expect(role?.priceCredScore).toBe(0)
  })

  it('does not increment for anonymous submissions (null userId)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const submission = await seedPriceSubmission(event.id, 'placeholder', {
      userId: null,
    })

    const res = await app.request(`/v1/admin/prices/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'corroborated' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 for missing submission', async () => {
    const res = await app.request(
      '/v1/admin/prices/submissions/00000000-0000-0000-0000-000000000000',
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    )
    expect(res.status).toBe(404)
  })
})
