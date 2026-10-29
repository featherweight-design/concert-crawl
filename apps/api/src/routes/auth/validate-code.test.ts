import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInviteCode } = vi.hoisted(() => ({
  mockInviteCode: {
    id: 'code-id-1',
    code: 'BETA-3C41-8BC0',
    usedBy: null,
    usedAt: null,
    expiresAt: null,
    revokedAt: null,
  },
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([mockInviteCode]),
  },
  inviteCodes: {},
}))

vi.mock('../../lib/rate-limit.js', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0 }),
}))

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { createApp } from '../../app.js'
import { inviteCodes } from '@concert-crawl/db'

const app = createApp()

describe('POST /v1/auth/validate-code', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid code format', async () => {
    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'NOTVALID' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid code', async () => {
    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 409 with error "used" for already-redeemed code', async () => {
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from(inviteCodes).where).mockResolvedValueOnce([
      { ...mockInviteCode, usedBy: 'user_abc', usedAt: new Date() },
    ])
    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toBe('used')
  })

  it('returns 404 with error "notfound" for unknown code', async () => {
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from(inviteCodes).where).mockResolvedValueOnce([])
    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BETA-XXXX-1234' }),
    })
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('notfound')
  })

  it('returns 429 when rate limited', async () => {
    const { checkRateLimit } = await import('../../lib/rate-limit.js')
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterMs: 30000,
    })
    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BETA-3C41-8BC0' }),
    })
    expect(res.status).toBe(429)
  })
})
