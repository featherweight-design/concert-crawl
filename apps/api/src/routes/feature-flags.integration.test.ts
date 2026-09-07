// Integration tests for the release-flag route gate and the public flag map.
//
// The guarantee worth the most here is the ordering one: requireFlag is mounted
// with router.use('*', ...) so it runs ahead of clerkMiddleware and
// requireFeature, which is what makes a flagged-off premium route answer 404
// rather than a 401 or a 403 that would confirm the feature exists.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted auth state so the Clerk mock can swap callers between tests. Same
// pattern as admin/founder-window.integration.test.ts. Leaving it null is what
// makes the unauthenticated cases below exercise the real 401/403 path — the
// real clerkMiddleware needs a secret key and 500s without one, which would let
// the "flag is on" case pass for the wrong reason.
type MockAuth = {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
} | null

const { authState } = vi.hoisted((): { authState: { current: MockAuth } } => ({
  authState: { current: null },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { auditLog } from '@concert-crawl/db'

import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { clearTables } from '../test/helpers/seed.js'
import { setFeatureFlag } from '../test/helpers/feature-flags.js'

const app = createApp()

const ADMIN_USER_ID = 'admin_feature_flag_test'

const setAdminAuth = (): void => {
  authState.current = {
    userId: ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const clearAuth = (): void => {
  authState.current = null
}

const adminHeaders = (): Record<string, string> => ({
  Authorization: 'Bearer admin-token',
})

describe('feature flag route gating', () => {
  beforeEach(async () => {
    await clearTables()
  })

  // Asserted per route, not per router: a router-level mount that silently
  // stopped matching one path is exactly the regression this catches.
  const crewRoutes = [
    { method: 'GET', path: '/v1/crews' },
    { method: 'POST', path: '/v1/crews' },
    { method: 'GET', path: '/v1/crews/00000000-0000-0000-0000-000000000000' },
  ]

  for (const route of crewRoutes) {
    it(`answers 404 for ${route.method} ${route.path} when crews is off`, async () => {
      const res = await app.request(route.path, { method: route.method })
      expect(res.status).toBe(404)
    })
  }

  it('answers 404 for the crew-invites router when crews is off', async () => {
    const res = await app.request('/v1/crew-invites/sometoken')
    expect(res.status).toBe(404)
  })

  it('answers 404 for the spotify router when spotify-sync is off', async () => {
    const res = await app.request('/v1/spotify/taste-picks')
    expect(res.status).toBe(404)
  })

  it('answers 404 rather than 401 or 403 while the flag is off', async () => {
    const res = await app.request('/v1/crews', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('stops answering 404 once the flag is turned on', async () => {
    await setFeatureFlag('crews', true)
    const res = await app.request('/v1/crews')
    // Now reaches auth, which rejects the unauthenticated request. Asserting
    // the exact 401 rather than "not 404" stops a 500 from reading as proof
    // that the gate stepped aside.
    expect(res.status).toBe(401)
  })
})

describe('GET /v1/flags', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns the merged flag map without authentication', async () => {
    const res = await app.request('/v1/flags')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('withholds the registry labels and descriptions', async () => {
    const res = await app.request('/v1/flags')
    const text = await res.text()
    expect(text).not.toContain('Spotify sync')
    expect(text).not.toContain('Browse crew lens')
  })

  it('sets a cache header matching the loader TTL', async () => {
    const res = await app.request('/v1/flags')
    expect(res.headers.get('cache-control')).toBe('public, max-age=30')
  })

  it('reflects a stored override', async () => {
    await setFeatureFlag('crews', true)
    const res = await app.request('/v1/flags')
    const body = await res.json()
    expect(body.data.crews).toBe(true)
  })
})

describe('admin feature flags', () => {
  beforeEach(async () => {
    // clearTables truncates feature_flags AND audit_log and drops the loader
    // cache, so it covers everything this suite writes.
    await clearTables()
    setAdminAuth()
  })

  it('lists every registry entry with its current state', async () => {
    const res = await app.request('/v1/admin/feature-flags', {
      headers: adminHeaders(),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(3)
    const crews = body.data.find((row: { key: string }) => row.key === 'crews')
    expect(crews).toMatchObject({
      key: 'crews',
      label: 'Crews',
      enabled: false,
      updatedAt: null,
      updatedBy: null,
    })
  })

  it('toggles a flag and returns the new state', async () => {
    const res = await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.enabled).toBe(true)
    expect(body.data.updatedAt).not.toBeNull()
  })

  it('moves updatedAt forward on a second toggle', async () => {
    // Asserting the status before reading the body keeps a failed PATCH from
    // surfacing as an opaque date-parse error further down.
    const patch = async (enabled: boolean) => {
      const res = await app.request('/v1/admin/feature-flags/crews', {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      expect(res.status).toBe(200)
      return res.json()
    }
    const first = await patch(true)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const second = await patch(false)
    expect(new Date(second.data.updatedAt).getTime()).toBeGreaterThan(
      new Date(first.data.updatedAt).getTime(),
    )
  })

  it('writes an audit row naming the flag and the new value', async () => {
    await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    const rows = await testDb.select().from(auditLog)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      action: 'feature_flag.toggle',
      targetId: 'feature_flag:crews',
    })
    expect(rows[0]?.metadata).toMatchObject({ enabled: true })
  })

  it('404s on a key that is not in the registry', async () => {
    const res = await app.request('/v1/admin/feature-flags/not-a-flag', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(404)
  })

  it('400s on a non-boolean body', async () => {
    const res = await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: 'yes' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a non-admin caller', async () => {
    clearAuth()
    const res = await app.request('/v1/admin/feature-flags')
    expect([401, 403]).toContain(res.status)
  })

  it('makes the change visible to the public endpoint immediately', async () => {
    await app.request('/v1/admin/feature-flags/crews', {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })
    const res = await app.request('/v1/flags')
    const body = await res.json()
    expect(body.data.crews).toBe(true)
  })
})
