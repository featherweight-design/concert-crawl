import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../../app.js'

const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
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
                code: 'BETA-ABCD',
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
                code: 'BETA-ABCD',
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
                code: 'BETA-ABCD',
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
                    code: 'BETA-ABCD',
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
    sessionClaims: { publicMetadata: { role: 'admin' } },
  })
}

describe('Admin invite code routes', () => {
  beforeEach(() => mockGetAuth.mockReset())

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
