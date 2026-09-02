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
import { subscriptions, userArtistFollows } from '@concert-crawl/db'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()
const USER_ID = 'user_follow_test'

const follow = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}/follow`, { method: 'POST' })

const unfollow = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}/follow`, { method: 'DELETE' })

// POST is gated on the `following` entitlement, which is premium-and-up. The
// free plan is modelled by the ABSENCE of a subscriptions row, so every test
// that expects a successful follow has to seed one.
const seedPremiumPlan = async (userId = USER_ID): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}

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
    // Premium, because the entitlement gate runs BEFORE the artist lookup. A
    // free user probing slugs gets 403 and learns nothing about what exists.
    await seedPremiumPlan()
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
    await seedPremiumPlan()
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
    await seedPremiumPlan()
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
    await seedPremiumPlan()
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
    await seedPremiumPlan()
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
    await seedPremiumPlan()
    authState.current = { userId: USER_ID }

    await follow('synced-act')
    await unfollow('synced-act')

    expect(spotifyMock.createSpotifyClient).not.toHaveBeenCalled()
  })
})

describe('POST /v1/artists/:slug/follow — entitlement gate', () => {
  beforeEach(async () => {
    authState.current = null
    spotifyMock.createSpotifyClient.mockClear()
    await clearTables()
  })

  it('returns 403 with entitlement_required for a free plan', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    // No subscriptions row at all: the default free plan.
    authState.current = { userId: USER_ID }

    const res = await follow(artist.slug)
    expect(res.status).toBe(403)
    const body: { code: string; feature: string } = await res.json()
    expect(body.code).toBe('entitlement_required')
    expect(body.feature).toBe('following')
    expect(await followRows()).toHaveLength(0)
  })

  it('lets a premium plan follow', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    await seedPremiumPlan()
    authState.current = { userId: USER_ID }

    const res = await follow(artist.slug)
    expect(res.status).toBe(200)
    expect(await followRows()).toHaveLength(1)
  })

  it('lets a lapsed plan unfollow — DELETE is never gated', async () => {
    const artist = await seedArtist({ name: 'Big Head Todd' })
    await seedPremiumPlan()
    authState.current = { userId: USER_ID }
    await follow(artist.slug)

    // The real downgrade path: followed while premium, then lapsed. Seeding a
    // free user with no follow to remove would pass trivially.
    await testDb.delete(subscriptions)

    const res = await unfollow(artist.slug)
    expect(res.status).toBe(200)
    expect(await followRows()).toHaveLength(0)
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
    await seedPremiumPlan()
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

  it('removes every row for the artist, whatever imported it', async () => {
    await seedArtist({
      name: 'Synced Act',
      canonicalName: 'synced act',
      spotifyArtistId: 'sp_synced',
    })
    // The detail read at the end 404s an artist that no consumer-visible event
    // bills (#1343), so the follow state can only be asserted on a real one.
    const venue = await seedVenue({ slug: 'marquis-synced' })
    await seedEvent(venue.id, {
      artist: 'Synced Act',
      canonicalArtist: 'synced act',
      date: '2099-09-04',
    })
    await seedPremiumPlan()
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

    const unfollowRes = await unfollow('synced-act')
    const unfollowBody: { data: { following: boolean } } =
      await unfollowRes.json()
    expect(unfollowBody.data.following).toBe(false)

    const remaining = await testDb
      .select()
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, USER_ID),
          eq(userArtistFollows.canonicalName, 'synced act'),
        ),
      )
    expect(remaining).toHaveLength(0)

    const read = await app.request('/v1/artists/synced-act')
    const readBody: { data: ArtistDetailResponse } = await read.json()
    expect(readBody.data.following).toBe(false)
  })
})
