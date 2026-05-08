import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetAuth, mockCode } = vi.hoisted(() => ({
  mockGetAuth: vi.fn(),
  mockCode: {
    id: 'code-id-1',
    code: 'BETA-3C41-8BC0',
    usedBy: null,
    usedAt: null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([mockCode]),
}
const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'code-id-1' }]),
}

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    update: vi.fn(() => mockUpdateChain),
  },
  inviteCodes: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
  gt: vi.fn(),
}))

import { createApp } from '../../app.js'

const app = createApp()

function authedUser(userId = 'user_123') {
  mockGetAuth.mockReturnValue({ userId, sessionClaims: { metadata: {} } })
}

describe('POST /v1/auth/redeem-code', () => {
  beforeEach(() => mockGetAuth.mockReset())

  it('returns 401 without auth', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: '' },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and marks code used', async () => {
    authedUser()
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 200 (idempotent) if already redeemed by same user', async () => {
    authedUser('user_123')
    mockSelectChain.where.mockResolvedValueOnce([
      { ...mockCode, usedBy: 'user_123', usedAt: new Date() },
    ])
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 409 if already used by different user', async () => {
    authedUser('user_new')
    mockSelectChain.where.mockResolvedValueOnce([
      { ...mockCode, usedBy: 'user_other', usedAt: new Date() },
    ])
    const res = await app.request('/v1/auth/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(409)
  })
})
