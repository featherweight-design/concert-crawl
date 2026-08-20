import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'

// Same lightweight mocks as routes/health.test.ts: createApp registers every
// route, so an unmocked import reaches the real Postgres client.
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@concert-crawl/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  venues: {},
  auditLog: {},
  inviteCodes: {},
}))
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

describe('CORS', () => {
  it('exposes Retry-After so the browser can read a 429 wait', async () => {
    const app = createApp()

    const res = await app.request('/v1/health', {
      headers: { Origin: 'http://localhost:3000' },
    })

    // Retry-After is not on the CORS safelist. Unnamed here, `res.headers.get`
    // returns null in the browser and the export row counts a flat hour.
    expect(res.headers.get('Access-Control-Expose-Headers') ?? '').toContain(
      'Retry-After',
    )
  })
})
