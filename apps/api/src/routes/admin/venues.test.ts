import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const { mockGetAuth, mockDb } = vi.hoisted(() => {
  const mockVenueRow = {
    id: 'venue-1',
    name: 'Ogden Theatre',
    slug: 'ogden-theatre',
    websiteUrl: 'https://ogdentheatre.com',
    city: 'Denver',
    active: true,
    verified: false,
    consecutiveFailures: 0,
    crawlDelayMs: 3000,
    lastCrawledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Chainable query builder that resolves to `resolveWith` when awaited
  function makeQueryBuilder(resolveWith: unknown[] = []) {
    const builder: Record<string, unknown> = {}
    const methods = [
      'select',
      'from',
      'where',
      'orderBy',
      'groupBy',
      'innerJoin',
      'leftJoin',
      'limit',
      'offset',
    ]
    for (const method of methods) {
      builder[method] = vi.fn().mockReturnValue(builder)
    }
    builder.then = (resolve: (val: unknown[]) => void) => {
      resolve(resolveWith)
      return Promise.resolve(resolveWith)
    }
    return builder
  }

  const mockDb = {
    _mockVenueRow: mockVenueRow,
    _makeQueryBuilder: makeQueryBuilder,
    select: vi.fn().mockReturnValue(makeQueryBuilder([])),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockVenueRow]),
    where: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  }

  return { mockGetAuth: vi.fn(), mockDb }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  venues: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    active: 'active',
    consecutiveFailures: 'consecutiveFailures',
  },
  events: { venueId: 'venue_id', status: 'status', date: 'date', id: 'id' },
  crawlRuns: {
    venueId: 'venue_id',
    status: 'status',
    durationMs: 'duration_ms',
    createdAt: 'created_at',
    id: 'id',
  },
  auditLog: {},
  inviteCodes: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue(true),
  and: vi.fn().mockReturnValue(true),
  gte: vi.fn().mockReturnValue(true),
  ne: vi.fn().mockReturnValue(true),
  count: vi.fn().mockReturnValue(true),
  avg: vi.fn().mockReturnValue(true),
  desc: vi.fn().mockReturnValue(true),
  isNotNull: vi.fn().mockReturnValue(true),
  sql: vi.fn().mockReturnValue(true),
}))

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('Admin venue routes', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockDb.select.mockReturnValue(mockDb._makeQueryBuilder([]))
  })

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
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
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
    // Slug check: no conflict
    mockDb.select.mockReturnValue(mockDb._makeQueryBuilder([]))
    mockDb.returning.mockResolvedValue([mockDb._mockVenueRow])
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
