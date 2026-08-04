// Integration tests for GET /v1/spotify/taste-picks (#763 PR 8, eng spec
// §9.4) — the discovery shelf endpoint. Entitlement-gated like the events
// taste=1 filter (anonymous → 401, non-premium → 403 entitlement_required),
// deterministic ranking (top-artist rank ascending → followed → soonest
// date), per-pick reason payload, and connection-status passthrough for the
// shelf's failure states.
import { describe, it, expect, beforeEach, vi } from 'vitest'

interface MockAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { sql } from 'drizzle-orm'
import {
  subscriptions,
  userArtistFollows,
  userSpotifyConnections,
} from '@concert-crawl/db'
import type {
  SpotifyConnectionStatus,
  SpotifyTastePicksResponse,
} from '@concert-crawl/types'
import { testDb } from '../test/helpers/db.js'
import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

const USER = 'user_taste_picks_1'

// Far-future dates so the `date >= today` visibility filter always passes.
const JUNE = '2030-06-01'
const JULY = '2030-07-01'
const AUGUST = '2030-08-01'

const signIn = (role?: string) => {
  authState.current = {
    userId: USER,
    sessionClaims: role ? { metadata: { role } } : {},
  }
}

const seedFollow = async (
  artistName: string,
  source: 'spotify_followed' | 'spotify_top' | 'manual' = 'spotify_followed',
  rank: number | null = null,
) => {
  await testDb.insert(userArtistFollows).values({
    userId: USER,
    artistName,
    canonicalName: artistName.toLowerCase().trim(),
    source,
    rank,
  })
}

const seedPremium = async () => {
  await testDb.insert(subscriptions).values({
    userId: USER,
    stripeCustomerId: `cus_${USER}`,
    stripeSubscriptionId: `sub_${USER}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}

const seedConnection = async (
  status: SpotifyConnectionStatus = 'connected',
) => {
  await testDb.insert(userSpotifyConnections).values({
    userId: USER,
    spotifyUserId: `spotify_${USER}`,
    status,
  })
}

interface PicksBody {
  success: boolean
  data: SpotifyTastePicksResponse
}

const fetchPicks = async (query = '') => {
  const res = await app.request(`/v1/spotify/taste-picks${query}`)
  const body = await res.json()
  return { status: res.status, body }
}

describe('GET /v1/spotify/taste-picks (#763 PR 8)', () => {
  beforeEach(async () => {
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
    authState.current = null
  })

  it('rejects anonymous requests with 401', async () => {
    const { status } = await fetchPicks()
    expect(status).toBe(401)
  })

  it('403s a free user with the typed entitlement code', async () => {
    signIn()
    const { status, body } = await fetchPicks()
    expect(status).toBe(403)
    expect(body.code).toBe('entitlement_required')
    expect(body.feature).toBe('spotify-sync')
  })

  it('403s an active supporter (spotify-sync is premium-up)', async () => {
    signIn()
    await testDb.insert(subscriptions).values({
      userId: USER,
      stripeCustomerId: `cus_${USER}`,
      stripeSubscriptionId: `sub_${USER}`,
      tier: 'supporter',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    })
    const { status } = await fetchPicks()
    expect(status).toBe(403)
  })

  it('rejects out-of-range and malformed limits with 400', async () => {
    signIn()
    await seedPremium()
    for (const bad of ['?limit=0', '?limit=26', '?limit=abc', '?limit=2.5']) {
      const { status } = await fetchPicks(bad)
      expect(status, bad).toBe(400)
    }
  })

  it('returns disconnected with zero picks when no connection row exists', async () => {
    signIn()
    await seedPremium()
    const { status, body } = await fetchPicks()
    expect(status).toBe(200)
    const picks: PicksBody = body
    expect(picks.data).toEqual({ status: 'disconnected', picks: [] })
  })

  it.each(['error', 'revoked'] as const)(
    'passes through a broken connection status (%s) with zero picks',
    async (connectionStatus) => {
      signIn()
      await seedPremium()
      await seedConnection(connectionStatus)
      // Even with a real match on the books — broken links pause picks.
      const venue = await seedVenue()
      await seedEvent(venue.id, { artist: 'Turnstile', date: JUNE })
      await seedFollow('Turnstile', 'spotify_top', 1)

      const { status, body } = await fetchPicks()
      expect(status).toBe(200)
      const picks: PicksBody = body
      expect(picks.data).toEqual({ status: connectionStatus, picks: [] })
    },
  )

  it('connected with no matches returns an empty picks array', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Unrelated Band', date: JUNE })
    await seedFollow('Turnstile', 'spotify_top', 1)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.status).toBe('connected')
    expect(picks.data.picks).toEqual([])
  })

  it('ranks top-artist matches by rank ascending, then followed, then soonest date', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    // Deliberately inverted dates: the followed match is the SOONEST show,
    // but rank-ordered top matches still lead the shelf.
    const followedSoonest = await seedEvent(venue.id, {
      artist: 'Big Head Todd',
      date: JUNE,
    })
    const rankThree = await seedEvent(venue.id, {
      artist: 'Alvvays',
      date: JULY,
    })
    const rankOne = await seedEvent(venue.id, {
      artist: 'Turnstile',
      date: AUGUST,
    })
    await seedFollow('Big Head Todd')
    await seedFollow('Alvvays', 'spotify_top', 3)
    await seedFollow('Turnstile', 'spotify_top', 1)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks.map((pick) => pick.eventId)).toEqual([
      rankOne.id,
      rankThree.id,
      followedSoonest.id,
    ])
  })

  it('breaks ties among followed matches by soonest date', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    const later = await seedEvent(venue.id, { artist: 'Alvvays', date: JULY })
    const sooner = await seedEvent(venue.id, {
      artist: 'Big Head Todd',
      date: JUNE,
    })
    await seedFollow('Alvvays')
    await seedFollow('Big Head Todd')

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks.map((pick) => pick.eventId)).toEqual([
      sooner.id,
      later.id,
    ])
  })

  it('breaks equal-rank ties by soonest date', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    // Same artist, two dates — both events carry the same rank-2 reason.
    const later = await seedEvent(venue.id, { artist: 'Turnstile', date: JULY })
    const sooner = await seedEvent(venue.id, {
      artist: 'Turnstile',
      title: 'Turnstile Night Two',
      date: JUNE,
    })
    await seedFollow('Turnstile', 'spotify_top', 2)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks.map((pick) => pick.eventId)).toEqual([
      sooner.id,
      later.id,
    ])
  })

  it('carries the reason payload and event projection per pick', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue({ name: 'Mission Ballroom', slug: 'mission' })
    const event = await seedEvent(venue.id, {
      artist: 'Turnstile',
      date: JUNE,
      ticketPriceMin: '39.00',
    })
    await seedFollow('Turnstile', 'spotify_top', 4)
    await seedFollow('Big Head Todd')
    const followedEvent = await seedEvent(venue.id, {
      artist: 'Big Head Todd',
      date: JULY,
    })

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks[0]).toMatchObject({
      eventId: event.id,
      artist: 'Turnstile',
      date: JUNE,
      ticketPriceMin: '39.00',
      venueName: 'Mission Ballroom',
      venueSlug: 'mission',
      reason: { kind: 'top', rank: 4, artistName: 'Turnstile' },
    })
    expect(picks.data.picks[1]).toMatchObject({
      eventId: followedEvent.id,
      reason: { kind: 'followed', artistName: 'Big Head Todd' },
    })
  })

  it('matches via canonical_supporting and reasons with the supporting artist', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Headliner Act',
      supportingArtists: ['MJ Lenderman'],
      canonicalSupporting: ['mj lenderman'],
      date: JUNE,
    })
    await seedFollow('MJ Lenderman', 'spotify_top', 2)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks).toHaveLength(1)
    expect(picks.data.picks[0]).toMatchObject({
      eventId: event.id,
      artist: 'Headliner Act',
      reason: { kind: 'top', rank: 2, artistName: 'MJ Lenderman' },
    })
  })

  // The co-headliner arm has to reach the in-memory reason derivation too, or
  // a row matched only by it finds no reason and gets dropped (#1419).
  it('matches via canonical_headliners and reasons with the co-headliner', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      artist: 'Desert Dwellers',
      title: 'Desert Dwellers & Great Dane',
      canonicalHeadliners: ['desert dwellers', 'great dane'],
      date: JUNE,
    })
    await seedFollow('Great Dane', 'spotify_top', 3)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks).toHaveLength(1)
    expect(picks.data.picks[0]).toMatchObject({
      eventId: event.id,
      reason: { kind: 'top', rank: 3, artistName: 'Great Dane' },
    })
  })

  it('uses the strongest reason when an event matches both a top and a followed artist', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Turnstile',
      supportingArtists: ['Alvvays'],
      canonicalSupporting: ['alvvays'],
      date: JUNE,
    })
    // Headliner is merely followed; the supporting act is a rank-1 top
    // artist — the stronger (top) reason wins.
    await seedFollow('Turnstile')
    await seedFollow('Alvvays', 'spotify_top', 1)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks).toHaveLength(1)
    expect(picks.data.picks[0]?.reason).toEqual({
      kind: 'top',
      rank: 1,
      artistName: 'Alvvays',
    })
  })

  it('manual follow rows never produce picks', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: JUNE })
    await seedFollow('Phoebe Bridgers', 'manual')

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks).toEqual([])
  })

  it('excludes consumer-hidden events', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Turnstile',
      date: JUNE,
      hiddenFromConsumer: true,
    })
    await seedFollow('Turnstile', 'spotify_top', 1)

    const { body } = await fetchPicks()
    const picks: PicksBody = body
    expect(picks.data.picks).toEqual([])
  })

  it('respects the limit parameter', async () => {
    signIn()
    await seedPremium()
    await seedConnection()
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Turnstile', date: JUNE })
    await seedEvent(venue.id, { artist: 'Alvvays', date: JULY })
    await seedEvent(venue.id, { artist: 'Big Head Todd', date: AUGUST })
    await seedFollow('Turnstile', 'spotify_top', 1)
    await seedFollow('Alvvays', 'spotify_top', 2)
    await seedFollow('Big Head Todd')

    const { body } = await fetchPicks('?limit=2')
    const picks: PicksBody = body
    expect(picks.data.picks).toHaveLength(2)
  })

  it('roleComped users pass the gate without billing rows', async () => {
    signIn('admin')
    await seedConnection()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { artist: 'Turnstile', date: JUNE })
    await seedFollow('Turnstile', 'spotify_top', 1)

    const { status, body } = await fetchPicks()
    expect(status).toBe(200)
    const picks: PicksBody = body
    expect(picks.data.picks.map((pick) => pick.eventId)).toEqual([event.id])
  })
})
