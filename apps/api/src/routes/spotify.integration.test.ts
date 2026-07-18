// Integration tests for the Spotify connection API + sync engine (#763 PR 3,
// eng spec §5/§6/§8.1 phase 1). The Spotify HTTP layer is stubbed at the
// fetch boundary and Clerk at the SDK boundary — no real Spotify calls ever.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState, clerkState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
  clerkState: {
    externalAccounts: [] as Array<{ id: string; provider: string }>,
    token: null as string | null,
    deleteCalls: [] as Array<{ userId: string; externalAccountId: string }>,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        externalAccounts: clerkState.externalAccounts,
        publicMetadata: {},
      }),
      getUserOauthAccessToken: async () => {
        if (!clerkState.token) throw new Error('no spotify token on user')
        return { data: [{ token: clerkState.token }] }
      },
      deleteUserExternalAccount: async (params: {
        userId: string
        externalAccountId: string
      }) => {
        clerkState.deleteCalls.push(params)
        return { deleted: true }
      },
    },
  }),
}))

import { and, eq, inArray } from 'drizzle-orm'
import {
  db,
  costTracking,
  userArtistFollows,
  userEvents,
  userSpotifyConnections,
} from '@concert-crawl/db'
import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'

const app = createApp()

// --- Spotify HTTP stub (fetch boundary) ---

interface SpotifyStubArtist {
  id: string
  name: string
}

const spotifyState = {
  profile: { id: 'spotify-user-1', display_name: 'Huey' },
  followedPages: [[]] as SpotifyStubArtist[][],
  top: [] as SpotifyStubArtist[],
  // When set, every Spotify request answers with this bare status code.
  failStatus: null as number | null,
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const spotifyFetchStub = async (
  input: RequestInfo | URL,
): Promise<Response> => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
  if (!url.startsWith('https://api.spotify.com/')) {
    throw new Error(`unexpected non-Spotify fetch in test: ${url}`)
  }
  if (spotifyState.failStatus !== null) {
    return new Response('', { status: spotifyState.failStatus })
  }
  if (url.includes('/me/following')) {
    const after = new URL(url).searchParams.get('after')
    const pageIndex = after === null ? 0 : Number(after)
    const items = spotifyState.followedPages[pageIndex] ?? []
    const hasNext = pageIndex + 1 < spotifyState.followedPages.length
    return jsonResponse({
      artists: {
        items,
        cursors: { after: hasNext ? String(pageIndex + 1) : null },
      },
    })
  }
  if (url.includes('/me/top/artists')) {
    return jsonResponse({ items: spotifyState.top })
  }
  return jsonResponse(spotifyState.profile)
}

// Re-stub fetch per test: the drain-background setup file installs a
// reject-all fetch stub in a beforeAll (network guard), which runs AFTER
// this module evaluates — so a module-scope stub here would be clobbered.
// beforeEach runs after every setup-file hook, keeping the Spotify stub live.
// No afterAll cleanup here: drain-background's own afterAll runs
// vi.unstubAllGlobals() last, and unstubbing earlier would drop the reject-all
// network guard while the worker is still live.
beforeEach(() => {
  vi.stubGlobal('fetch', spotifyFetchStub)
})

// --- helpers ---

// Unique per test: the sync route's attempt limiter is an in-memory
// module-level store keyed by userId, so a shared id would leak rate-limit
// state across tests (same pattern as feedback.integration.test.ts).
let USER = 'user-spotify-1'
let userSeq = 0

function setAuth(userId: string): void {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

function linkSpotifyAccount(): void {
  clerkState.externalAccounts = [{ id: 'eac_1', provider: 'oauth_spotify' }]
  clerkState.token = 'spotify-access-token'
}

async function connect(): Promise<Response> {
  return app.request('/v1/spotify/connection', { method: 'POST' })
}

async function getConnectionRow(userId: string) {
  const [row] = await testDb
    .select()
    .from(userSpotifyConnections)
    .where(eq(userSpotifyConnections.userId, userId))
    .limit(1)
  return row ?? null
}

async function getSpotifyFollows(userId: string) {
  return testDb
    .select()
    .from(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, userId),
        inArray(userArtistFollows.source, ['spotify_followed', 'spotify_top']),
      ),
    )
}

async function backdateLastSynced(userId: string): Promise<void> {
  await testDb
    .update(userSpotifyConnections)
    .set({ lastSyncedAt: new Date(Date.now() - 11 * 60 * 1000) })
    .where(eq(userSpotifyConnections.userId, userId))
}

interface ConnectionBody {
  success: boolean
  data: {
    status: string
    displayName: string | null
    artistCount: number
    lastSyncedAt: string | null
    autoWatch: boolean
    digestEnabled: boolean
    pushEnabled: boolean
  }
}

beforeEach(async () => {
  userSeq += 1
  USER = `user-spotify-${userSeq}`
  authState.current = null
  clerkState.externalAccounts = []
  clerkState.token = null
  clerkState.deleteCalls = []
  spotifyState.profile = { id: 'spotify-user-1', display_name: 'Huey' }
  spotifyState.followedPages = [[]]
  spotifyState.top = []
  spotifyState.failStatus = null
  await clearTables()
})

describe('auth guards', () => {
  it.each([
    ['GET', '/v1/spotify/connection'],
    ['POST', '/v1/spotify/connection'],
    ['PATCH', '/v1/spotify/connection'],
    ['DELETE', '/v1/spotify/connection'],
    ['POST', '/v1/spotify/connection/sync'],
  ])('%s %s returns 401 when unauthenticated', async (method, path) => {
    const res = await app.request(path, { method })
    expect(res.status).toBe(401)
  })
})

describe('GET /v1/spotify/connection', () => {
  it('returns disconnected when no connection row exists', async () => {
    setAuth(USER)
    const res = await app.request('/v1/spotify/connection')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(body.data).toEqual({ status: 'disconnected' })
  })
})

describe('POST /v1/spotify/connection', () => {
  it('rejects with 400 when no Spotify external account is linked', async () => {
    setAuth(USER)
    const res = await connect()
    expect(res.status).toBe(400)
    expect(await getConnectionRow(USER)).toBeNull()
  })

  it('creates the connection and runs the first sync inline', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [
      [
        { id: 'a1', name: 'Beyoncé' },
        { id: 'a2', name: 'Sigur Rós' },
      ],
      [{ id: 'a3', name: 'Khruangbin' }],
    ]
    spotifyState.top = [
      { id: 'a1', name: 'Beyoncé' },
      { id: 't1', name: 'MIKE' },
    ]

    const res = await connect()
    expect(res.status).toBe(201)
    const body = (await res.json()) as ConnectionBody
    expect(body.data.status).toBe('connected')
    expect(body.data.displayName).toBe('Huey')
    // 4 distinct artist ids across both sources (a1 overlaps)
    expect(body.data.artistCount).toBe(4)
    expect(body.data.lastSyncedAt).not.toBeNull()
    expect(body.data.autoWatch).toBe(false)

    const follows = await getSpotifyFollows(USER)
    const followed = follows.filter((row) => row.source === 'spotify_followed')
    const top = follows.filter((row) => row.source === 'spotify_top')
    expect(followed).toHaveLength(3)
    expect(top).toHaveLength(2)

    // canonicalName written via the shared JS canonicalizeArtist (parity rule)
    const beyonce = followed.find((row) => row.spotifyArtistId === 'a1')
    expect(beyonce?.canonicalName).toBe('beyonce')
    const sigur = followed.find((row) => row.spotifyArtistId === 'a2')
    expect(sigur?.canonicalName).toBe('sigur ros')

    // rank is 1-based for spotify_top, null for followed
    expect(top.find((row) => row.spotifyArtistId === 'a1')?.rank).toBe(1)
    expect(top.find((row) => row.spotifyArtistId === 't1')?.rank).toBe(2)
    expect(followed.every((row) => row.rank === null)).toBe(true)
  })

  it('writes a zero-dollar cost_tracking row with call counts (E10)', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [[{ id: 'a1', name: 'Alpha' }]]
    const res = await connect()
    expect(res.status).toBe(201)

    const rows = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'spotify'))
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0]?.costUsd).toBe('0.000000')
    const metadata: unknown = JSON.parse(rows[0]?.metadata ?? '{}')
    expect(metadata).toMatchObject({ outcome: 'synced', userId: USER })
  })

  it('reconnecting a revoked connection flips it back to connected and preserves prefs', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    await testDb
      .update(userSpotifyConnections)
      .set({ status: 'revoked', autoWatch: true, digestEnabled: false })
      .where(eq(userSpotifyConnections.userId, USER))

    const res = await connect()
    expect(res.status).toBe(201)
    const body = (await res.json()) as ConnectionBody
    expect(body.data.status).toBe('connected')
    expect(body.data.autoWatch).toBe(true)
    expect(body.data.digestEnabled).toBe(false)
  })
})

describe('POST /v1/spotify/connection/sync', () => {
  it('404s when there is no connection', async () => {
    setAuth(USER)
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(404)
  })

  it('replaces each source set: stale rows go, manual rows survive', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [
      [
        { id: 'a1', name: 'Alpha' },
        { id: 'a2', name: 'Beta' },
      ],
    ]
    await connect()

    // Manual follow must never be touched by a Spotify sync
    await testDb.insert(userArtistFollows).values({
      userId: USER,
      artistName: 'Manual Band',
      source: 'manual',
      canonicalName: 'manual band',
    })

    // Next pull drops a2, renames a1, adds a3
    spotifyState.followedPages = [
      [
        { id: 'a1', name: 'Alpha Renamed' },
        { id: 'a3', name: 'Gamma' },
      ],
    ]
    await backdateLastSynced(USER)
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(200)

    const spotifyRows = await getSpotifyFollows(USER)
    const ids = spotifyRows.map((row) => row.spotifyArtistId).sort()
    expect(ids).toEqual(['a1', 'a3'])
    expect(
      spotifyRows.find((row) => row.spotifyArtistId === 'a1')?.artistName,
    ).toBe('Alpha Renamed')

    const manualRows = await testDb
      .select()
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, USER),
          eq(userArtistFollows.source, 'manual'),
        ),
      )
    expect(manualRows).toHaveLength(1)
  })

  it('rate limits refreshes within 10 minutes with 429 + Retry-After', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()

    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(429)
    const retryAfter = Number(res.headers.get('Retry-After'))
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(600)
  })

  it('rate limits repeated refresh attempts even when the sync fails', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    await backdateLastSynced(USER)

    // Failed syncs never advance lastSyncedAt — the attempt limiter is what
    // stops refresh spam during a Spotify outage.
    spotifyState.failStatus = 502
    const first = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(first.status).toBe(200)

    const second = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(second.status).toBe(429)
    const retryAfter = Number(second.headers.get('Retry-After'))
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(600)
  })

  it('allows a refresh once the window has passed', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    await backdateLastSynced(USER)
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
  })

  it('marks the connection revoked and purges Spotify rows on a Spotify 401', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [[{ id: 'a1', name: 'Alpha' }]]
    await connect()
    expect(await getSpotifyFollows(USER)).toHaveLength(1)

    await backdateLastSynced(USER)
    spotifyState.failStatus = 401
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as ConnectionBody
    expect(body.data.status).toBe('revoked')

    // Row retained (revoke banner + Reconnect), artist rows purged
    const row = await getConnectionRow(USER)
    expect(row?.status).toBe('revoked')
    expect(await getSpotifyFollows(USER)).toHaveLength(0)
  })

  it('marks the connection error (not revoked) on a Spotify 5xx', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [[{ id: 'a1', name: 'Alpha' }]]
    await connect()

    await backdateLastSynced(USER)
    spotifyState.failStatus = 503
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as ConnectionBody
    expect(body.data.status).toBe('error')

    const row = await getConnectionRow(USER)
    expect(row?.status).toBe('error')
    expect(row?.lastSyncError).toBeTruthy()
    // A transient failure never nukes the previous artist set
    expect(await getSpotifyFollows(USER)).toHaveLength(1)
  })

  it('marks the connection error when the persistence transaction fails', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [[{ id: 'a1', name: 'Alpha' }]]
    await connect()

    await backdateLastSynced(USER)
    const transactionSpy = vi
      .spyOn(db, 'transaction')
      .mockRejectedValueOnce(new Error('deadlock detected'))
    try {
      const res = await app.request('/v1/spotify/connection/sync', {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as ConnectionBody
      expect(body.data.status).toBe('error')
    } finally {
      transactionSpy.mockRestore()
    }

    const row = await getConnectionRow(USER)
    expect(row?.status).toBe('error')
    expect(row?.lastSyncError).toContain('deadlock')
    // A persistence failure never nukes the previous artist set
    expect(await getSpotifyFollows(USER)).toHaveLength(1)
  })

  it('rejects sync on a revoked connection with 409', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    await testDb
      .update(userSpotifyConnections)
      .set({ status: 'revoked' })
      .where(eq(userSpotifyConnections.userId, USER))
    await backdateLastSynced(USER)
    const res = await app.request('/v1/spotify/connection/sync', {
      method: 'POST',
    })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /v1/spotify/connection', () => {
  it('404s when there is no connection', async () => {
    setAuth(USER)
    const res = await app.request('/v1/spotify/connection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoWatch: true }),
    })
    expect(res.status).toBe(404)
  })

  it('422s on an empty or invalid body', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    const empty = await app.request('/v1/spotify/connection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(empty.status).toBe(422)
    const invalid = await app.request('/v1/spotify/connection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoWatch: 'yes' }),
    })
    expect(invalid.status).toBe(422)
  })

  it('updates the toggles and returns the fresh payload', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    await connect()
    const res = await app.request('/v1/spotify/connection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoWatch: true, digestEnabled: false }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as ConnectionBody
    expect(body.data.autoWatch).toBe(true)
    expect(body.data.digestEnabled).toBe(false)
    expect(body.data.pushEnabled).toBe(true)
  })
})

describe('DELETE /v1/spotify/connection', () => {
  it('404s when there is no connection', async () => {
    setAuth(USER)
    const res = await app.request('/v1/spotify/connection', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('purges Spotify data but keeps manual follows and watching rows', async () => {
    setAuth(USER)
    linkSpotifyAccount()
    spotifyState.followedPages = [[{ id: 'a1', name: 'Alpha' }]]
    spotifyState.top = [{ id: 't1', name: 'Top One' }]
    await connect()

    await testDb.insert(userArtistFollows).values({
      userId: USER,
      artistName: 'Manual Band',
      source: 'manual',
      canonicalName: 'manual band',
    })
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await testDb.insert(userEvents).values({
      userId: USER,
      eventId: event.id,
      status: 'watching',
    })

    const res = await app.request('/v1/spotify/connection', {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)

    // Connection row + spotify follows gone
    expect(await getConnectionRow(USER)).toBeNull()
    expect(await getSpotifyFollows(USER)).toHaveLength(0)

    // Purge invariants: manual follows + watching rows survive
    const manualRows = await testDb
      .select()
      .from(userArtistFollows)
      .where(eq(userArtistFollows.userId, USER))
    expect(manualRows).toHaveLength(1)
    expect(manualRows[0]?.source).toBe('manual')
    const watching = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, USER))
    expect(watching).toHaveLength(1)

    // Clerk external account deleted (grant revoked)
    expect(clerkState.deleteCalls).toEqual([
      { userId: USER, externalAccountId: 'eac_1' },
    ])

    const after = await app.request('/v1/spotify/connection')
    const body = (await after.json()) as { data: { status: string } }
    expect(body.data.status).toBe('disconnected')
  })
})
