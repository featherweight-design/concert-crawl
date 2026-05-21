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
  sql: vi.fn((parts, ...vals) => ({ parts, vals })),
}))

vi.mock('@concert-crawl/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
  feedback: {
    id: 'id',
    userId: 'userId',
    pageUrl: 'pageUrl',
    category: 'category',
    message: 'message',
    metadata: 'metadata',
    status: 'status',
    adminNotes: 'adminNotes',
    issueUrl: 'issueUrl',
    createdAt: 'createdAt',
  },
  auditLog: {},
  inviteCodes: {},
  crawlRuns: {},
  notifications: {},
  events: { id: 'id', verified: 'verified' },
  priceSubmissions: { id: 'id', status: 'status' },
}))

const FEEDBACK_ID = '11111111-1111-1111-1111-111111111111'

const mockFeedbackRow = {
  id: FEEDBACK_ID,
  userId: 'user_abc123',
  pageUrl: 'https://example.com/events',
  category: 'bug',
  message: 'Something is broken',
  metadata: null,
  status: 'unread',
  adminNotes: null,
  issueUrl: null,
  createdAt: new Date('2026-05-07T10:00:00Z'),
}

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

function userAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'user_123',
    sessionClaims: { metadata: { role: 'user' } },
  })
}

describe('GET /v1/admin/feedback', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/feedback')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    userAuth()
    const res = await createApp().request('/v1/admin/feedback')
    expect(res.status).toBe(403)
  })

  it('returns 200 with feedback array', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where().orderBy().limit).mockResolvedValueOnce(
      [mockFeedbackRow],
    )
    const res = await createApp().request('/v1/admin/feedback')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0].id).toBe(FEEDBACK_ID)
  })

  it('filters by status when provided', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where().orderBy().limit).mockResolvedValueOnce(
      [mockFeedbackRow],
    )
    const res = await createApp().request('/v1/admin/feedback?status=unread')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('rejects invalid status values', async () => {
    adminAuth()
    const res = await createApp().request(
      '/v1/admin/feedback?status=invalid_status',
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /v1/admin/feedback/counts', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/feedback/counts')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    userAuth()
    const res = await createApp().request('/v1/admin/feedback/counts')
    expect(res.status).toBe(403)
  })

  it('returns 200 with unread count', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    // counts route: db.select().from().where() — no limit, where() resolves
    vi.mocked(db.select().from().where).mockResolvedValueOnce([{ unread: 7 }])
    const res = await createApp().request('/v1/admin/feedback/counts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.data.unread).toBe('number')
  })
})

describe('PATCH /v1/admin/feedback/:id', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    userAuth()
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 and updates feedback status', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockFeedbackRow, status: 'read' },
    ])
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('read')
  })

  it('returns 400 on empty body (no fields to update)', async () => {
    adminAuth()
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 422 on invalid status value', async () => {
    adminAuth()
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'totally_invalid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when feedback not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    })
    expect(res.status).toBe(404)
  })
})
