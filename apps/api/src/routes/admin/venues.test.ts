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
    where: vi.fn().mockReturnThis(),
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

  it('POST /v1/admin/venues sets verified: true so Save & crawl now works', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(mockDb._makeQueryBuilder([]))
    const verifiedVenue = { ...mockDb._mockVenueRow, verified: true }
    mockDb.returning.mockResolvedValue([verifiedVenue])
    mockDb.values.mockClear()
    const res = await createApp().request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        websiteUrl: 'https://www.bluebirdtheater.net/calendar/',
        city: 'Denver',
      }),
    })
    expect(res.status).toBe(201)
    // Ensure verified: true was passed to the insert
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true }),
    )
  })

  it('PATCH /v1/admin/venues/:id accepts crawlWaitForSelector', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
    mockDb.returning.mockResolvedValue([
      { ...mockDb._mockVenueRow, crawlWaitForSelector: '.event-card' },
    ])
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crawlWaitForSelector: '.event-card' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { crawlWaitForSelector: string }
    }
    expect(body.data.crawlWaitForSelector).toBe('.event-card')
  })

  it('PATCH /v1/admin/venues/:id accepts null crawlWaitForSelector to clear it', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
    mockDb.returning.mockResolvedValue([
      { ...mockDb._mockVenueRow, crawlWaitForSelector: null },
    ])
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crawlWaitForSelector: null }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { crawlWaitForSelector: null }
    }
    expect(body.data.crawlWaitForSelector).toBeNull()
  })

  it('PATCH /v1/admin/venues/:id sets verifiedAt when verified: true', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
    const verifiedAt = new Date()
    mockDb.returning.mockResolvedValue([
      {
        ...mockDb._mockVenueRow,
        verified: true,
        verifiedBy: 'Hugh',
        verifiedAt,
      },
    ])
    mockDb.set.mockClear()
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: true, verifiedBy: 'Hugh' }),
    })
    expect(res.status).toBe(200)
    // verifiedAt is auto-set by the route — must be passed to db.set
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedAt: expect.any(Date) }),
    )
    const body = (await res.json()) as {
      success: boolean
      data: { verified: boolean; verifiedBy: string; verifiedAt: string }
    }
    expect(body.data.verified).toBe(true)
    expect(body.data.verifiedBy).toBe('Hugh')
    expect(body.data.verifiedAt).toBeTruthy()
  })

  it('PATCH /v1/admin/venues/:id accepts debugCaptureHtml: true', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
    mockDb.returning.mockResolvedValue([
      { ...mockDb._mockVenueRow, debugCaptureHtml: true },
    ])
    mockDb.set.mockClear()
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugCaptureHtml: true }),
    })
    expect(res.status).toBe(200)
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ debugCaptureHtml: true }),
    )
    const body = (await res.json()) as {
      success: boolean
      data: { debugCaptureHtml: boolean }
    }
    expect(body.data.debugCaptureHtml).toBe(true)
  })

  it('PATCH /v1/admin/venues/:id rejects non-boolean debugCaptureHtml', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([mockDb._mockVenueRow]),
    )
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugCaptureHtml: 'yes' }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /v1/admin/venues/:id nulls verifiedBy and verifiedAt when verified: false', async () => {
    adminAuth()
    mockDb.select.mockReturnValue(
      mockDb._makeQueryBuilder([
        {
          ...mockDb._mockVenueRow,
          verified: true,
          verifiedBy: 'Hugh',
          verifiedAt: new Date(),
        },
      ]),
    )
    mockDb.returning.mockResolvedValue([
      {
        ...mockDb._mockVenueRow,
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
      },
    ])
    mockDb.set.mockClear()
    const res = await createApp().request('/v1/admin/venues/venue-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: false }),
    })
    expect(res.status).toBe(200)
    // Route must explicitly null both fields
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedBy: null, verifiedAt: null }),
    )
    const body = (await res.json()) as {
      success: boolean
      data: { verified: boolean; verifiedBy: null; verifiedAt: null }
    }
    expect(body.data.verified).toBe(false)
    expect(body.data.verifiedBy).toBeNull()
    expect(body.data.verifiedAt).toBeNull()
  })
})
