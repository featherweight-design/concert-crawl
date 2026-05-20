import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockSendInviteCodeEmail = vi.fn()
vi.mock('../../lib/email.js', () => ({
  sendInviteCodeEmail: (...args: unknown[]) => mockSendInviteCodeEmail(...args),
}))

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('@concert-crawl/db', () => {
  const mockDb = {
    select: vi.fn(function mockSelect() {
      return {
        from: vi.fn(function mockFrom() {
          return {
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'code-1',
                code: 'BETA-ABCD-EF12',
                createdBy: 'admin_123',
                usedBy: null,
                usedAt: null,
                expiresAt: null,
                revokedAt: null,
                revokedBy: null,
                createdAt: new Date(),
              },
            ]),
            where: vi.fn().mockResolvedValue([
              {
                id: 'code-1',
                code: 'BETA-ABCD-EF12',
                createdBy: 'admin_123',
                usedBy: null,
                usedAt: null,
                expiresAt: null,
                revokedAt: null,
                revokedBy: null,
                createdAt: new Date(),
              },
            ]),
          }
        }),
      }
    }),
    insert: vi.fn(function mockInsert() {
      return {
        values: vi.fn(function mockValues() {
          return {
            returning: vi.fn().mockResolvedValue([
              {
                id: 'code-1',
                code: 'BETA-ABCD-EF12',
                createdBy: 'admin_123',
                usedBy: null,
                usedAt: null,
                expiresAt: null,
                revokedAt: null,
                revokedBy: null,
                createdAt: new Date(),
              },
            ]),
          }
        }),
      }
    }),
    update: vi.fn(function mockUpdate() {
      return {
        set: vi.fn(function mockSet() {
          return {
            where: vi.fn(function mockWhere() {
              return {
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'code-1',
                    code: 'BETA-ABCD-EF12',
                    createdBy: 'admin_123',
                    usedBy: null,
                    usedAt: null,
                    expiresAt: null,
                    revokedAt: new Date('2026-04-24'),
                    revokedBy: 'admin_123',
                    createdAt: new Date(),
                  },
                ]),
              }
            }),
          }
        }),
      }
    }),
  }
  return {
    db: mockDb,
    inviteCodes: {},
    auditLog: {},
    venues: {},
  }
})

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  })
}

describe('Admin invite code routes', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
    mockSendInviteCodeEmail.mockReset()
  })

  it('GET /v1/admin/invite-codes returns 200 for admin', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/invite-codes')
    expect(res.status).toBe(200)
  })

  it('POST /v1/admin/invite-codes generates a code and returns 201', async () => {
    adminAuth()
    const res = await createApp().request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { code: string }
    }
    expect(body.success).toBe(true)
    expect(typeof body.data.code).toBe('string')
  })

  it('POST /v1/admin/invite-codes calls sendInviteCodeEmail when recipientEmail is provided', async () => {
    adminAuth()
    mockSendInviteCodeEmail.mockResolvedValue(undefined)
    await createApp().request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    })
    // Fire-and-forget: yield to allow the async IIFE to run
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSendInviteCodeEmail).toHaveBeenCalledWith(
      'test@example.com',
      'BETA-ABCD-EF12',
    )
  })

  it('POST /v1/admin/invite-codes returns 201 even when sendInviteCodeEmail throws', async () => {
    adminAuth()
    mockSendInviteCodeEmail.mockRejectedValue(new Error('Resend unavailable'))
    const res = await createApp().request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'test@example.com' }),
    })
    expect(res.status).toBe(201)
  })

  it('POST /v1/admin/invite-codes does not call sendInviteCodeEmail when recipientEmail is absent', async () => {
    adminAuth()
    await createApp().request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockSendInviteCodeEmail).not.toHaveBeenCalled()
  })

  it('POST /v1/admin/invite-codes/:id/revoke sets revokedAt and returns 200', async () => {
    adminAuth()
    const res = await createApp().request(
      '/v1/admin/invite-codes/code-1/revoke',
      {
        method: 'POST',
      },
    )
    expect(res.status).toBe(200)
  })
})
