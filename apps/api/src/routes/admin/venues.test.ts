import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

// Mock Clerk auth — simulate admin user
const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

// Mock drizzle-orm operators used in venue routes
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(),
}))

// Mock the database
vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
    groupBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'venue-1',
        name: 'Ogden Theatre',
        slug: 'ogden-theatre',
        websiteUrl: 'https://ogdentheatre.com',
        city: 'Denver',
        active: true,
        verified: false,
        consecutiveFailures: 0,
        crawlDelayMs: 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  venues: {},
  events: {},
  auditLog: {},
  inviteCodes: {},
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('Admin venue routes', () => {
  beforeEach(() => mockGetAuth.mockReset())

  it('GET /v1/admin/venues returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(401)
  })

  it('GET /v1/admin/venues returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { publicMetadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(403)
  })

  it('GET /v1/admin/venues returns 200 and array for admin', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /v1/admin/venues returns 400 for missing required fields', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Missing Fields' }), // no slug or websiteUrl
    })
    expect(res.status).toBe(400)
  })

  it('POST /v1/admin/venues creates a venue and returns 201', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ogden Theatre',
        slug: 'ogden-theatre',
        websiteUrl: 'https://ogdentheatre.com',
        city: 'Denver',
      }),
    })
    expect(res.status).toBe(201)
  })
})
