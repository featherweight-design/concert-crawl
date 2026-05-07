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
import { clearTables, seedVenue } from '../../test/helpers/seed.js'

const app = createApp()

function setAuth(role: 'admin' | 'sub_admin' | 'user'): void {
  authState.current = {
    userId: 'test-user-1',
    sessionClaims: { metadata: { role } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated as user role', async () => {
    setAuth('user')
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with venue list as admin', async () => {
    setAuth('admin')
    await seedVenue({ name: 'Ogden Theatre', slug: 'ogden-theatre' })

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { name: string }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.name).toBe('Ogden Theatre')
  })

  it('admin returns all venues including inactive', async () => {
    setAuth('admin')
    await seedVenue({
      name: 'Active Venue',
      slug: 'active-venue',
      active: true,
    })
    await seedVenue({
      name: 'Inactive Venue',
      slug: 'inactive-venue',
      active: false,
    })

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { name: string; active: boolean }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
  })
})

describe('POST /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Venue',
        slug: 'test-venue',
        websiteUrl: 'https://testvenue.example.com',
      }),
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 on missing required fields', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete' }),
    })
    expect(res.status).toBe(400)
  })

  it('creates a venue and returns 201', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        websiteUrl: 'https://bluebirdtheater.com',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { id: string; name: string; slug: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Bluebird Theater')
    expect(body.data.slug).toBe('bluebird-theater')
    expect(body.data.id).toBeDefined()
  })
})
