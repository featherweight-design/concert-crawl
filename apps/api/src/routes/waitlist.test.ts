import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@concert-crawl/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
  },
  waitlistEntries: {},
}))

vi.mock('../lib/rate-limit.js', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
}))

import { createApp } from '../app.js'

const app = createApp()

describe('POST /v1/waitlist', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid email', async () => {
    const res = await app.request('/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid submission', async () => {
    const res = await app.request('/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jordan', email: 'jordan@test.com' }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 200 (not 409) for duplicate email — no enumeration', async () => {
    const res = await app.request('/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@test.com' }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 429 when rate limited', async () => {
    const { checkRateLimit } = await import('../lib/rate-limit.js')
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 60000,
    })
    const res = await app.request('/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    })
    expect(res.status).toBe(429)
  })
})
