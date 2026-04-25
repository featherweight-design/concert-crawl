import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Role } from '@concert-crawl/types'

// Mock getAuth so we control what session it returns
const mockGetAuth = vi.fn()
vi.mock('@hono/clerk-auth', () => ({
  getAuth: () => mockGetAuth(),
}))

// Import after mock is set up
const { requireRole } = await import('./role.js')

describe('requireRole middleware', () => {
  beforeEach(() => {
    mockGetAuth.mockReset()
  })

  function makeApp(minimumRole: Role) {
    const app = new Hono()
    app.use('/route', requireRole(minimumRole))
    app.get('/route', (ctx) => ctx.json({ ok: true }))
    return app
  }

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuth.mockReturnValue(null)
    const res = await makeApp('admin').request('/route')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no role in metadata', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: {} },
    })
    const res = await makeApp('admin').request('/route')
    expect(res.status).toBe(403)
  })

  it('returns 403 when user role is below minimum', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'user' } },
    })
    const res = await makeApp('admin').request('/route')
    expect(res.status).toBe(403)
  })

  it('allows exact role match', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'sub_admin' } },
    })
    const res = await makeApp('sub_admin').request('/route')
    expect(res.status).toBe(200)
  })

  it('allows higher role to access lower-role route', async () => {
    mockGetAuth.mockReturnValue({
      userId: 'user_123',
      sessionClaims: { metadata: { role: 'admin' } },
    })
    const res = await makeApp('user').request('/route')
    expect(res.status).toBe(200)
  })
})
