import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState, dispatchMock } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
  dispatchMock: vi.fn(),
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

// Mock crawler-core's fetchers entry so probe tests never hit the network.
// venues.ts imports { dispatch, AegSchemaError } — provide both (plus
// AegFetchError for parity with the real module surface).
vi.mock('@concert-crawl/crawler-core/fetchers', () => {
  class AegFetchError extends Error {}
  class AegSchemaError extends Error {}
  return { dispatch: dispatchMock, AegFetchError, AegSchemaError }
})

import { AegSchemaError } from '@concert-crawl/crawler-core/fetchers'
import { createApp } from '../../app.js'
import { clearTables, seedVenue } from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import { auditLog, venues } from '@concert-crawl/db'
import { desc, eq } from 'drizzle-orm'

const app = createApp()

function setAuth(role: 'admin' | 'sub_admin' | 'user'): void {
  authState.current = {
    userId: 'test-user-1',
    sessionClaims: { metadata: { role } },
  }
}

function clearAuth(): void {
  authState.current = null
}

async function latestAuditRow(): Promise<
  typeof auditLog.$inferSelect | undefined
> {
  const [row] = await testDb
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1)
  return row
}

describe('PATCH /v1/admin/venues/:id — platform routing (#721)', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
    dispatchMock.mockReset()
  })

  it('accepts and persists platform + platformVenueId', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'AEG Venue', slug: 'aeg-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'aeg', platformVenueId: '89' }),
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { platform: string | null; platformVenueId: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.platform).toBe('aeg')
    expect(body.data.platformVenueId).toBe('89')

    const [persisted] = await testDb
      .select({
        platform: venues.platform,
        platformVenueId: venues.platformVenueId,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(persisted?.platform).toBe('aeg')
    expect(persisted?.platformVenueId).toBe('89')
  })

  it('rejects platform without platformVenueId with 400', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'AEG Venue', slug: 'aeg-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'aeg' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects platformVenueId alone when the venue has no platform', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'AEG Venue', slug: 'aeg-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformVenueId: '89' }),
    })
    expect(res.status).toBe(400)

    const [persisted] = await testDb
      .select({ platformVenueId: venues.platformVenueId })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(persisted?.platformVenueId).toBeNull()
  })

  it('rejects clearing platformVenueId while platform stays set', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'AEG Venue',
      slug: 'aeg-venue',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformVenueId: null }),
    })
    expect(res.status).toBe(400)

    const [persisted] = await testDb
      .select({
        platform: venues.platform,
        platformVenueId: venues.platformVenueId,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(persisted?.platform).toBe('aeg')
    expect(persisted?.platformVenueId).toBe('89')
  })

  it('rejects whitespace-only platformVenueId', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'AEG Venue', slug: 'aeg-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'aeg', platformVenueId: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('clears platformVenueId when platform is set to null', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'AEG Venue',
      slug: 'aeg-venue',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: null }),
    })
    expect(res.status).toBe(200)

    const [persisted] = await testDb
      .select({
        platform: venues.platform,
        platformVenueId: venues.platformVenueId,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(persisted?.platform).toBeNull()
    expect(persisted?.platformVenueId).toBeNull()
  })

  it('writes a venue.platform_changed audit row with before/after meta', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'AEG Venue', slug: 'aeg-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'aeg', platformVenueId: '89' }),
    })
    expect(res.status).toBe(200)

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.platform_changed')
    expect(audit?.targetId).toBe(venue.id)
    expect(audit?.metadata).toEqual({
      before: { platform: null, platformVenueId: null },
      after: { platform: 'aeg', platformVenueId: '89' },
    })
  })

  it('keeps venue.update audit action when platform fields are untouched', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Plain Venue', slug: 'plain-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Plain Venue Updated' }),
    })
    expect(res.status).toBe(200)

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.update')
  })
})

describe('POST /v1/admin/venues/:id/probe-platform — integration (#665)', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
    dispatchMock.mockReset()
  })

  it('returns 404 for unknown venue', async () => {
    setAuth('admin')
    const res = await app.request(
      '/v1/admin/venues/00000000-0000-0000-0000-000000000000/probe-platform',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(404)
  })

  it('returns missing_config when no fetcher matches', async () => {
    setAuth('admin')
    dispatchMock.mockReturnValue(null)
    const venue = await seedVenue({ name: 'No Platform', slug: 'no-platform' })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { ok: boolean; reason?: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.ok).toBe(false)
    expect(body.data.reason).toBe('missing_config')

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.platform_probe')
    expect(audit?.metadata).toMatchObject({ outcome: 'missing_config' })
  })

  it('normalizes whitespace-only platformVenueId to a cleared proposal', async () => {
    setAuth('admin')
    dispatchMock.mockReturnValue(null)
    const venue = await seedVenue({
      name: 'AEG Venue',
      slug: 'aeg-venue',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'aeg', platformVenueId: '   ' }),
      },
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { ok: boolean; reason?: string }
    }
    expect(body.data.ok).toBe(false)
    expect(body.data.reason).toBe('missing_config')

    // The fetcher dispatch saw null, not '   ' — the whitespace never
    // reached canHandle()
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ platformVenueId: null }),
    )
  })

  it('returns ok with eventsFound and sourceUrl on success', async () => {
    setAuth('admin')
    const fetchMock = vi.fn().mockResolvedValue({
      events: [{ title: 'Show A' }, { title: 'Show B' }],
      sourceUrl: 'https://aegwebprod.blob.core.windows.net/json/events/89',
    })
    dispatchMock.mockReturnValue({ platform: 'aeg', fetch: fetchMock })
    const venue = await seedVenue({
      name: 'AEG Venue',
      slug: 'aeg-venue',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: {
        ok: boolean
        eventsFound: number
        fetchLatencyMs: number
        sourceUrl: string
      }
    }
    expect(body.data.ok).toBe(true)
    expect(body.data.eventsFound).toBe(2)
    expect(typeof body.data.fetchLatencyMs).toBe('number')
    expect(body.data.sourceUrl).toBe(
      'https://aegwebprod.blob.core.windows.net/json/events/89',
    )

    // Dry-run: fetch called with zero crawl delay, saved config as candidate
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'aeg', platformVenueId: '89' }),
      { crawlDelayMs: 0 },
    )
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'aeg', platformVenueId: '89' }),
    )

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.platform_probe')
    expect(audit?.metadata).toMatchObject({ outcome: 'ok' })
  })

  it('overlays proposed config from the body over the saved venue', async () => {
    setAuth('admin')
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ events: [], sourceUrl: 'https://example.com/feed' })
    dispatchMock.mockReturnValue({ platform: 'aeg', fetch: fetchMock })
    const venue = await seedVenue({
      name: 'Unsaved Config',
      slug: 'unsaved-config',
    })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'aeg', platformVenueId: '42' }),
      },
    )
    expect(res.status).toBe(200)
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'aeg', platformVenueId: '42' }),
    )

    // Dry-run guarantee: nothing was written back to the venue row
    const [persisted] = await testDb
      .select({
        platform: venues.platform,
        platformVenueId: venues.platformVenueId,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(persisted?.platform).toBeNull()
    expect(persisted?.platformVenueId).toBeNull()
  })

  it('returns fetch_error when the platform fetch throws', async () => {
    setAuth('admin')
    dispatchMock.mockReturnValue({
      platform: 'aeg',
      fetch: vi.fn().mockRejectedValue(new Error('AEG feed returned 503')),
    })
    const venue = await seedVenue({
      name: 'Broken Feed',
      slug: 'broken-feed',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { ok: boolean; reason?: string; error?: string }
    }
    expect(body.data.ok).toBe(false)
    expect(body.data.reason).toBe('fetch_error')
    expect(body.data.error).toBe('AEG feed returned 503')
  })

  it('returns schema_error when the fetch throws AegSchemaError', async () => {
    setAuth('admin')
    dispatchMock.mockReturnValue({
      platform: 'aeg',
      fetch: vi
        .fn()
        .mockRejectedValue(new AegSchemaError('unexpected feed shape')),
    })
    const venue = await seedVenue({
      name: 'Bad Schema',
      slug: 'bad-schema',
      platform: 'aeg',
      platformVenueId: '89',
    })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/probe-platform`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { ok: boolean; reason?: string }
    }
    expect(body.data.ok).toBe(false)
    expect(body.data.reason).toBe('schema_error')
  })

  it('returns 403 for non-admin users', async () => {
    setAuth('user')
    const res = await app.request(
      '/v1/admin/venues/00000000-0000-0000-0000-000000000000/probe-platform',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(403)
  })
})
