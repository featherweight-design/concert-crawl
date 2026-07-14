import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockSendAdminAlertEmail = vi.fn()
const mockSendTestEmail = vi.fn()
vi.mock('../../lib/email.js', () => ({
  sendAdminAlertEmail: (...args: unknown[]) => mockSendAdminAlertEmail(...args),
  sendTestEmail: (...args: unknown[]) => mockSendTestEmail(...args),
}))

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

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/notifications')
    expect(res.status).toBe(403)
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

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(
      `/v1/admin/notifications/${NOTIF_ID}/read`,
      {
        method: 'PATCH',
      },
    )
    expect(res.status).toBe(403)
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

describe('POST /v1/admin/notifications/test-email', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockSendAdminAlertEmail.mockReset()
    mockSendTestEmail.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )
    expect(res.status).toBe(401)
    expect(mockSendAdminAlertEmail).not.toHaveBeenCalled()
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )
    expect(res.status).toBe(403)
    expect(mockSendAdminAlertEmail).not.toHaveBeenCalled()
  })

  it('returns 200 with sent:true when email helper succeeds', async () => {
    adminAuth()
    mockSendAdminAlertEmail.mockResolvedValueOnce({
      sent: true,
      resendId: 'resend_abc123',
    })

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ sent: true, resendId: 'resend_abc123' })
    expect(mockSendAdminAlertEmail).toHaveBeenCalledTimes(1)
    const [payload] = mockSendAdminAlertEmail.mock.calls[0]
    expect(payload.subject).toBe('Concert Crawl — test alert')
    expect(payload.html).toContain('admin user admin_123')
    expect(payload.text).toContain('admin user admin_123')
  })

  it('returns 200 with sent:false reason when helper signals missing config', async () => {
    adminAuth()
    mockSendAdminAlertEmail.mockResolvedValueOnce({
      sent: false,
      reason: 'missing_api_key',
    })

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ sent: false, reason: 'missing_api_key' })
  })

  it('returns 200 with send_failed when helper returns an Error in result.error', async () => {
    adminAuth()
    mockSendAdminAlertEmail.mockResolvedValueOnce({
      sent: false,
      reason: 'send_failed',
      error: new Error('network timeout'),
    })

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.sent).toBe(false)
    expect(body.data.reason).toBe('send_failed')
  })

  it('defaults to the generic admin alert when no emailKey is given', async () => {
    adminAuth()
    mockSendAdminAlertEmail.mockResolvedValueOnce({
      sent: true,
      resendId: 'resend_default',
    })

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      { method: 'POST' },
    )

    expect(res.status).toBe(200)
    expect(mockSendAdminAlertEmail).toHaveBeenCalledTimes(1)
    expect(mockSendTestEmail).not.toHaveBeenCalled()
  })

  it('routes a template key through sendTestEmail', async () => {
    adminAuth()
    mockSendTestEmail.mockResolvedValueOnce({
      sent: true,
      resendId: 'resend_welcome',
    })

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailKey: 'welcome_paid' }),
      },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ sent: true, resendId: 'resend_welcome' })
    expect(mockSendTestEmail).toHaveBeenCalledWith('welcome_paid')
    expect(mockSendAdminAlertEmail).not.toHaveBeenCalled()
  })

  it('rejects an unknown emailKey with 400', async () => {
    adminAuth()

    const res = await createApp().request(
      '/v1/admin/notifications/test-email',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailKey: 'not_a_real_key' }),
      },
    )

    expect(res.status).toBe(400)
    expect(mockSendTestEmail).not.toHaveBeenCalled()
    expect(mockSendAdminAlertEmail).not.toHaveBeenCalled()
  })
})

describe('GET /v1/admin/notifications/test-email/options', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request(
      '/v1/admin/notifications/test-email/options',
    )
    expect(res.status).toBe(401)
  })

  it('returns the grouped picker options for admins', async () => {
    adminAuth()
    const res = await createApp().request(
      '/v1/admin/notifications/test-email/options',
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    const groups = new Set(body.data.map((opt: { group: string }) => opt.group))
    expect(groups).toContain('Customer')
    expect(groups).toContain('Operational')
    for (const opt of body.data) {
      expect(typeof opt.key).toBe('string')
      expect(typeof opt.label).toBe('string')
    }
  })
})

describe('POST /v1/admin/notifications/read-all', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await createApp().request('/v1/admin/notifications/read-all', {
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await createApp().request('/v1/admin/notifications/read-all', {
      method: 'POST',
    })
    expect(res.status).toBe(403)
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
