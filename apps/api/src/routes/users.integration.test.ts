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

// Mock Clerk client — deleteUser and getUser
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        publicMetadata: { role: 'user' },
        createdAt: new Date('2026-04-01').getTime(),
      }),
      deleteUser: vi.fn().mockResolvedValue({}),
    },
  }),
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_test123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me')
    expect(res.status).toBe(401)
  })

  it('returns profile with defaults when no profile row exists', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { handle: null; theme: string; plan: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.handle).toBeNull()
    expect(body.data.theme).toBe('electric')
    expect(body.data.plan).toBe('founder')
  })

  it('returns saved handle when profile exists', async () => {
    setAuth()
    await seedUserProfile('user_test123', { handle: 'testuser' })
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: { handle: string }
    }
    expect(body.data.handle).toBe('testuser')
  })
})

describe('PATCH /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a profile with handle', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(200)
  })

  it('rejects reserved handles with 422', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'admin' }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects taken handles with 409', async () => {
    await seedUserProfile('user_other', { handle: 'taken' })
    setAuth('user_test123')
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'taken' }),
    })
    expect(res.status).toBe(409)
  })
})

describe('GET /v1/users/me/submissions', () => {
  it('returns user submissions with display status', async () => {
    setAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123', {
      status: 'corroborated',
      priceMin: '40',
    })

    const res = await app.request('/v1/users/me/submissions', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ status: string; priceMin: number }>
    }
    expect(body.success).toBe(true)
    expect(body.data[0]?.status).toBe('confirmed')
    expect(body.data[0]?.priceMin).toBe(4000)
  })
})

describe('GET /v1/users/handle-availability', () => {
  beforeEach(async () => {
    setAuth()
    await clearTables()
  })

  it('returns available: true for free handle', async () => {
    const res = await app.request(
      '/v1/users/handle-availability?handle=freehandle',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean }
    }
    expect(body.data.available).toBe(true)
  })

  it('returns available: false for reserved word', async () => {
    const res = await app.request(
      '/v1/users/handle-availability?handle=admin',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean; reason: string }
    }
    expect(body.data.available).toBe(false)
    expect(body.data.reason).toBe('reserved')
  })

  it('returns available: false for taken handle', async () => {
    await seedUserProfile('user_other2', { handle: 'takenone' })
    const res = await app.request(
      '/v1/users/handle-availability?handle=takenone',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean }
    }
    expect(body.data.available).toBe(false)
  })
})

describe('DELETE /v1/users/me', () => {
  it('anonymizes submissions and deletes profile', async () => {
    setAuth()
    await clearTables()
    await seedUserProfile('user_test123')
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123')

    const res = await app.request('/v1/users/me', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
  })
})
