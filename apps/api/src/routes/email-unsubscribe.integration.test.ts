// Integration tests for GET /v1/email/unsubscribe (#763 spec §8.2) — the
// signed one-click digest opt-out. No auth (email links work logged-out).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { eq } from 'drizzle-orm'
import { userSpotifyConnections } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { clearTables } from '../test/helpers/seed.js'
import { buildUnsubscribeToken } from '../lib/email-unsubscribe.js'

const app = createApp()

const seedConnection = async (userId: string): Promise<void> => {
  await testDb.insert(userSpotifyConnections).values({
    userId,
    spotifyUserId: `spotify_${userId}`,
    status: 'connected',
    digestEnabled: true,
  })
}

const getDigestEnabled = async (userId: string): Promise<boolean | null> => {
  const rows = await testDb
    .select({ digestEnabled: userSpotifyConnections.digestEnabled })
    .from(userSpotifyConnections)
    .where(eq(userSpotifyConnections.userId, userId))
  return rows[0]?.digestEnabled ?? null
}

describe('GET /v1/email/unsubscribe — integration', () => {
  beforeEach(async () => {
    process.env['EMAIL_UNSUBSCRIBE_SECRET'] = 'integration-secret'
    await clearTables()
  })

  afterEach(() => {
    delete process.env['EMAIL_UNSUBSCRIBE_SECRET']
  })

  it('flips digestEnabled off with a valid token and confirms in HTML', async () => {
    await seedConnection('user_unsub_1')
    const token = buildUnsubscribeToken('user_unsub_1', 'digest')
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_1&family=digest&token=${token}`,
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('weekly digest')
    expect(await getDigestEnabled('user_unsub_1')).toBe(false)
  })

  it('is idempotent — second click still succeeds', async () => {
    await seedConnection('user_unsub_2')
    const token = buildUnsubscribeToken('user_unsub_2', 'digest')
    const url = `/v1/email/unsubscribe?uid=user_unsub_2&family=digest&token=${token}`
    expect((await app.request(url)).status).toBe(200)
    expect((await app.request(url)).status).toBe(200)
    expect(await getDigestEnabled('user_unsub_2')).toBe(false)
  })

  it('succeeds without leaking whether a connection exists', async () => {
    const token = buildUnsubscribeToken('user_no_conn', 'digest')
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_no_conn&family=digest&token=${token}`,
    )
    expect(res.status).toBe(200)
  })

  it('rejects a bad token and leaves digestEnabled on', async () => {
    await seedConnection('user_unsub_3')
    const res = await app.request(
      '/v1/email/unsubscribe?uid=user_unsub_3&family=digest&token=deadbeef',
    )
    expect(res.status).toBe(400)
    expect(await getDigestEnabled('user_unsub_3')).toBe(true)
  })

  it('rejects a token issued for another user', async () => {
    await seedConnection('user_unsub_4')
    const token = buildUnsubscribeToken('user_someone_else', 'digest')
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_4&family=digest&token=${token}`,
    )
    expect(res.status).toBe(400)
    expect(await getDigestEnabled('user_unsub_4')).toBe(true)
  })

  it('rejects a stale token after secret rotation', async () => {
    await seedConnection('user_unsub_5')
    const stale = buildUnsubscribeToken('user_unsub_5', 'digest')
    process.env['EMAIL_UNSUBSCRIBE_SECRET'] = 'rotated-secret'
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_5&family=digest&token=${stale}`,
    )
    expect(res.status).toBe(400)
    expect(await getDigestEnabled('user_unsub_5')).toBe(true)
  })

  it('rejects an unknown family with a 400 HTML page', async () => {
    const token = buildUnsubscribeToken('user_unsub_6', 'digest')
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_6&family=billing&token=${token}`,
    )
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('didn’t work')
  })

  it('rejects missing params with a 400 HTML page', async () => {
    const res = await app.request('/v1/email/unsubscribe?family=digest')
    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('didn’t work')
  })

  it('returns 503 when EMAIL_UNSUBSCRIBE_SECRET is not configured', async () => {
    await seedConnection('user_unsub_7')
    const token = buildUnsubscribeToken('user_unsub_7', 'digest')
    delete process.env['EMAIL_UNSUBSCRIBE_SECRET']
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_7&family=digest&token=${token}`,
    )
    expect(res.status).toBe(503)
    expect(await getDigestEnabled('user_unsub_7')).toBe(true)
  })

  it('returns 503 when EMAIL_UNSUBSCRIBE_SECRET is set but empty', async () => {
    await seedConnection('user_unsub_8')
    const token = buildUnsubscribeToken('user_unsub_8', 'digest')
    process.env['EMAIL_UNSUBSCRIBE_SECRET'] = ''
    const res = await app.request(
      `/v1/email/unsubscribe?uid=user_unsub_8&family=digest&token=${token}`,
    )
    expect(res.status).toBe(503)
    expect(await getDigestEnabled('user_unsub_8')).toBe(true)
  })
})
