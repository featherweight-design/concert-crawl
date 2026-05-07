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

import { createApp } from '../../app.js'
import { clearTables, seedEvent, seedVenue } from '../../test/helpers/seed.js'

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
