import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  lt: vi.fn(),
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
  notifications: {
    id: 'id',
    type: 'type',
    readAt: 'readAt',
    createdAt: 'createdAt',
  },
  auditLog: {},
  venues: {},
  inviteCodes: {},
  crawlRuns: {},
  events: {},
}))

const NOTIF_ID = '11111111-1111-1111-1111-111111111111'

const mockNotificationRow = {
  id: NOTIF_ID,
  userId: null,
  type: 'admin_alert',
  category: 'crawl.failed',
  title: 'Crawl failing: Ogden Theatre',
  body: '3 consecutive failures for Ogden Theatre',
  actionUrl: null,
  readAt: null,
  metadata: null,
  createdAt: new Date('2026-05-07T10:00:00Z'),
}

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('GET /v1/admin/notifications', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/notifications')
    expect(res.status).toBe(401)
  })

  it('returns 200 with notifications list', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.select().from().where().orderBy().limit).mockResolvedValueOnce(
      [mockNotificationRow],
    )
    const res = await createApp().request('/v1/admin/notifications')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0].id).toBe(NOTIF_ID)
  })

  it('defaults to limit=50', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    await createApp().request('/v1/admin/notifications')
    expect(
      vi.mocked(db.select().from().where().orderBy().limit),
    ).toHaveBeenCalledWith(50)
  })

  it('accepts limit query param', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    await createApp().request('/v1/admin/notifications?limit=10')
    expect(
      vi.mocked(db.select().from().where().orderBy().limit),
    ).toHaveBeenCalledWith(10)
  })

  it('rejects limit > 100', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications?limit=200')
    expect(res.status).toBe(400)
  })
})

describe('PATCH /v1/admin/notifications/:id/read', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      `/v1/admin/notifications/${NOTIF_ID}/read`,
      {
        method: 'PATCH',
      },
    )
    expect(res.status).toBe(401)
  })

  it('returns 200 and marks notification as read', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([
      { ...mockNotificationRow, readAt: new Date() },
    ])
    const res = await createApp().request(
      `/v1/admin/notifications/${NOTIF_ID}/read`,
      {
        method: 'PATCH',
      },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.readAt).not.toBeNull()
  })

  it('returns 404 when notification not found', async () => {
    adminAuth()
    const { db } = await import('@concert-crawl/db')
    vi.mocked(db.update().set().where().returning).mockResolvedValueOnce([])
    const res = await createApp().request(
      `/v1/admin/notifications/${NOTIF_ID}/read`,
      {
        method: 'PATCH',
      },
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /v1/admin/notifications/read-all', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 200 and marks all admin_alert notifications as read', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/notifications/read-all', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
