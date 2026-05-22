import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
  and: vi.fn((...args) => ({ args, op: 'and' })),
  asc: vi.fn((col) => ({ col, dir: 'asc' })),
  gte: vi.fn((col, val) => ({ col, val, op: 'gte' })),
  sql: vi.fn((parts, ...vals) => ({ parts, vals })),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
  events: {
    id: 'id',
    verified: 'verified',
    venueId: 'venueId',
    createdAt: 'createdAt',
    date: 'date',
    title: 'title',
    artist: 'artist',
    doorsTime: 'doorsTime',
    showTime: 'showTime',
    ticketPriceMin: 'ticketPriceMin',
    ticketPriceMax: 'ticketPriceMax',
    confidenceScore: 'confidenceScore',
    extractionStrategy: 'extractionStrategy',
    sourceUrl: 'sourceUrl',
    genre: 'genre',
  },
  venues: {
    id: 'id',
    name: 'name',
  },
  auditLog: {},
  inviteCodes: {},
  crawlRuns: {},
  notifications: {},
}))

const EVENT_ID = '22222222-2222-2222-2222-222222222222'
const VENUE_ID = '33333333-3333-3333-3333-333333333333'

const mockEventRow = {
  id: EVENT_ID,
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-06-01',
  doorsTime: null,
  showTime: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  confidenceScore: 0.6,
  verified: false,
  extractionStrategy: 'llm',
  sourceUrl: null,
  genre: null,
  createdAt: new Date('2026-05-07T10:00:00Z'),
  venueId: VENUE_ID,
  venueName: 'Test Venue',
}

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('GET /v1/admin/events/count', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/events/count')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/events/count')
    expect(res.status).toBe(403)
  })

  it('returns 200 with pending and approved counts', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where().limit().offset)
      .mockResolvedValueOnce([{ total: 12 }])
      .mockResolvedValueOnce([{ total: 218 }])
    const res = await createApp().request('/v1/admin/events/count')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.pending).toBe(12)
    expect(body.data.approved).toBe(218)
  })
})

describe('GET /v1/admin/events', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/events')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/events')
    expect(res.status).toBe(403)
  })

  it('returns 200 with events list including venue name', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(
      db.select().from().leftJoin().where().orderBy().limit().offset,
    ).mockResolvedValueOnce([mockEventRow])
    const res = await createApp().request('/v1/admin/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0].id).toBe(EVENT_ID)
    expect(body.data[0].venueName).toBe('Test Venue')
    expect(typeof body.data[0].confidenceScore).toBe('number')
    // Regression: verify the select contains the ::float cast so the postgres
    // numeric string is coerced to a JS number before reaching the client.
    const { sql: sqlMock } = await import('drizzle-orm')
    expect(vi.mocked(sqlMock)).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining(')::float')]),
      expect.anything(),
    )
  })

  it('defaults to limit=50 and offset=0', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    await createApp().request('/v1/admin/events')
    expect(
      vi.mocked(db.select().from().leftJoin().where().orderBy().limit),
    ).toHaveBeenCalledWith(50)
    expect(
      vi.mocked(db.select().from().leftJoin().where().orderBy().limit().offset),
    ).toHaveBeenCalledWith(0)
  })

  it('accepts limit and offset query params', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    await createApp().request('/v1/admin/events?limit=10&offset=20')
    expect(
      vi.mocked(db.select().from().leftJoin().where().orderBy().limit),
    ).toHaveBeenCalledWith(10)
    expect(
      vi.mocked(db.select().from().leftJoin().where().orderBy().limit().offset),
    ).toHaveBeenCalledWith(20)
  })

  it('rejects limit > 500', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/events?limit=600')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /v1/admin/events/:id/verify', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}/verify`,
      { method: 'PATCH' },
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}/verify`,
      { method: 'PATCH' },
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 and marks event as verified', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockEventRow, verified: true },
    ])
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}/verify`,
      { method: 'PATCH' },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.verified).toBe(true)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(
      `/v1/admin/events/${EVENT_ID}/verify`,
      { method: 'PATCH' },
    )
    expect(res.status).toBe(404)
  })
})

describe('PATCH /v1/admin/events/:id', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 and updates content fields', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockEventRow, title: 'Updated Title', artist: 'New Artist' },
    ])
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title', artist: 'New Artist' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Updated Title')
    expect(body.data.artist).toBe('New Artist')
  })

  it('returns 200 and accepts nullable price fields', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockEventRow, ticketPriceMin: '25.00', ticketPriceMax: null },
    ])
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketPriceMin: '25.00', ticketPriceMax: null }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.ticketPriceMin).toBe('25.00')
    expect(body.data.ticketPriceMax).toBeNull()
  })

  it('returns 400 for invalid date format', async () => {
    adminAuth()
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: 'not-a-date' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /v1/admin/events/:id', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 and deletes the event', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.delete().where().returning).mockResolvedValueOnce([
      mockEventRow,
    ])
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when event not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.delete().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(`/v1/admin/events/${EVENT_ID}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /v1/admin/events/bulk-auto-approve', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      '/v1/admin/events/bulk-auto-approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(
      '/v1/admin/events/bulk-auto-approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(403)
  })

  it('returns 200 with approved count using default threshold', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ok: 1 },
      { ok: 1 },
      { ok: 1 },
    ])
    const res = await createApp().request(
      '/v1/admin/events/bulk-auto-approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.approved).toBe(3)
  })

  it('returns 200 with approved count using custom threshold', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ok: 1 },
      { ok: 1 },
    ])
    const res = await createApp().request(
      '/v1/admin/events/bulk-auto-approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: 0.9 }),
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.approved).toBe(2)
  })
})
