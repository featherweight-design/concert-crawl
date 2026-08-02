// Integration tests for POST/DELETE /v1/artists/:slug/follow (#1115, PR-D).
//
// Two invariants are load-bearing here:
//   1. Follow writes OUR table only — it must never touch the user's Spotify
//      account (design brief §3.5). Asserted by spying the Spotify client.
//   2. A manual follow lands at most once per user per artist. The API's
//      read-before-insert handles the common repeat; the partial unique index
//      on (user_id, canonical_name) WHERE source='manual' (migration 0070) is
//      what holds when two requests race, since the older
//      (user_id, source, spotify_artist_id) index can't dedupe the NULL
//      spotify_artist_id of an unmatched artist.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState, spotifyMock } = vi.hoisted(() => ({
  authState: {
    current: null as { userId: string } | null,
  },
  spotifyMock: {
    createSpotifyClient: vi.fn(() => {
      throw new Error('Follow must never construct a Spotify client')
    }),
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

vi.mock('../lib/spotify.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/spotify.js')>()
  return { ...original, createSpotifyClient: spotifyMock.createSpotifyClient }
})

import { and, eq } from 'drizzle-orm'
import { userArtistFollows } from '@concert-crawl/db'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { clearTables, seedArtist } from '../test/helpers/seed.js'

const app = createApp()
const USER_ID = 'user_follow_test'

const follow = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}/follow`, { method: 'POST' })

const unfollow = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}/follow`, { method: 'DELETE' })

const followRows = async (
  userId = USER_ID,
): Promise<(typeof userArtistFollows.$inferSelect)[]> =>
  testDb
    .select()
    .from(userArtistFollows)
    .where(eq(userArtistFollows.userId, userId))

describe('POST /v1/artists/:slug/follow — integration', () => {
  beforeEach(async () => {
    authState.current = null
    spotifyMock.createSpotifyClient.mockClear()
    await clearTables()
  })

  it('401s without a session', async () => {
    await seedArtist({ name: 'Gate Act' })
    const res = await follow('gate-act')
    expect(res.status).toBe(401)
    expect(await followRows()).toHaveLength(0)
  })

  it('404s an unknown slug', async () => {
    authState.current = { userId: USER_ID }
    const res = await follow('no-such-artist')
    expect(res.status).toBe(404)
    const body: { success: boolean; error: string } = await res.json()
    expect(body).toEqual({ success: false, error: 'Artist not found' })
  })

  it('inserts a manual follow carrying the canonical name and the matched Spotify id', async () => {
    await seedArtist({
      name: 'Nightjar Choir',
      canonicalName: 'nightjar choir',
      spotifyArtistId: 'sp_nightjar',
    })
    authState.current = { userId: USER_ID }

    const res = await follow('nightjar-choir')
    expect(res.status).toBe(200)
    const body: { success: boolean; data: { following: boolean } } =
      await res.json()
    expect(body).toEqual({ success: true, data: { following: true } })

    const rows = await followRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      artistName: 'Nightjar Choir',
      canonicalName: 'nightjar choir',
      spotifyArtistId: 'sp_nightjar',
      source: 'manual',
    })
  })

  it('leaves spotifyArtistId null for an unmatched artist', async () => {
    await seedArtist({
      name: 'Wax Harbour',
      canonicalName: 'wax harbour',
    })
    authState.current = { userId: USER_ID }

    await follow('wax-harbour')
    const rows = await followRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.spotifyArtistId).toBeNull()
  })

  it('is idempotent — a double POST yields exactly one row', async () => {
    await seedArtist({
      name: 'Wax Harbour',
      canonicalName: 'wax harbour',
    })
    authState.current = { userId: USER_ID }

    const first = await follow('wax-harbour')
    const second = await follow('wax-harbour')
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const secondBody: { data: { following: boolean } } = await second.json()
    expect(secondBody.data.following).toBe(true)

    expect(await followRows()).toHaveLength(1)
  })

  it('stays at one row when two follows race past the read-before-insert', async () => {
    await seedArtist({
      name: 'Wax Harbour',
      canonicalName: 'wax harbour',
    })
    authState.current = { userId: USER_ID }

    // Both requests see an empty table, so both reach the INSERT. Only the
    // partial unique index from migration 0070 stops the second one, and
    // onConflictDoNothing is what keeps it a 200 rather than a 500.
    const [first, second] = await Promise.all([
      follow('wax-harbour'),
      follow('wax-harbour'),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await followRows()).toHaveLength(1)
  })

  it('never touches Spotify on follow or unfollow', async () => {
    await seedArtist({
      name: 'Synced Act',
      canonicalName: 'synced act',
      spotifyArtistId: 'sp_synced',
    })
    authState.current = { userId: USER_ID }

    await follow('synced-act')
    await unfollow('synced-act')

    expect(spotifyMock.createSpotifyClient).not.toHaveBeenCalled()
  })

  it('succeeds for a free-plan user — Follow carries no entitlement gate', async () => {
    await seedArtist({
      name: 'Free Act',
      canonicalName: 'free act',
    })
    // No subscriptions row at all: the default free plan.
    authState.current = { userId: 'user_free_plan' }

    const res = await follow('free-act')
    expect(res.status).toBe(200)
    expect(await followRows('user_free_plan')).toHaveLength(1)
  })
})

describe('DELETE /v1/artists/:slug/follow — integration', () => {
  beforeEach(async () => {
    authState.current = null
    spotifyMock.createSpotifyClient.mockClear()
    await clearTables()
  })

  it('401s without a session', async () => {
    await seedArtist({ name: 'Gate Act' })
    const res = await unfollow('gate-act')
    expect(res.status).toBe(401)
  })

  it('removes the manual row and is idempotent when there is nothing to remove', async () => {
    await seedArtist({
      name: 'Wax Harbour',
      canonicalName: 'wax harbour',
    })
    authState.current = { userId: USER_ID }

    await follow('wax-harbour')
    const res = await unfollow('wax-harbour')
    expect(res.status).toBe(200)
    const body: { success: boolean; data: { following: boolean } } =
      await res.json()
    expect(body).toEqual({ success: true, data: { following: false } })
    expect(await followRows()).toHaveLength(0)

    const again = await unfollow('wax-harbour')
    expect(again.status).toBe(200)
  })

  it('removes only the manual row, leaving a Spotify-synced follow intact — and the artist still reads as followed', async () => {
    await seedArtist({
      name: 'Synced Act',
      canonicalName: 'synced act',
      spotifyArtistId: 'sp_synced',
    })
    authState.current = { userId: USER_ID }
    await testDb.insert(userArtistFollows).values({
      userId: USER_ID,
      artistName: 'Synced Act',
      canonicalName: 'synced act',
      spotifyArtistId: 'sp_synced',
      source: 'spotify_followed',
    })

    await follow('synced-act')
    expect(await followRows()).toHaveLength(2)

    // The response reports the effective state, so it agrees with the GET
    // below rather than claiming a follow that is still there is gone.
    const unfollowRes = await unfollow('synced-act')
    const unfollowBody: { data: { following: boolean } } =
      await unfollowRes.json()
    expect(unfollowBody.data.following).toBe(true)

    const remaining = await testDb
      .select()
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, USER_ID),
          eq(userArtistFollows.canonicalName, 'synced act'),
        ),
      )
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.source).toBe('spotify_followed')

    // Any row counts as following, so the read endpoint still says true.
    const read = await app.request('/v1/artists/synced-act')
    const readBody: { data: ArtistDetailResponse } = await read.json()
    expect(readBody.data.following).toBe(true)
  })
})
