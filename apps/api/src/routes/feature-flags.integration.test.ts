// Integration tests for the release-flag route gate and the public flag map.
//
// The guarantee worth the most here is the ordering one: requireFlag is mounted
// with router.use('*', ...) so it runs ahead of clerkMiddleware and
// requireFeature, which is what makes a flagged-off premium route answer 404
// rather than a 401 or a 403 that would confirm the feature exists.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The real clerkMiddleware needs a secret key and 500s without one, which would
// let the "flag is on" case pass for the wrong reason. Mocked to an
// unauthenticated session so the gate's downstream is a genuine 401.
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables } from '../test/helpers/seed.js'
import { setFeatureFlag } from '../test/helpers/feature-flags.js'

const app = createApp()

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
