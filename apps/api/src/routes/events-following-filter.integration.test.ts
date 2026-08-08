// Integration tests for the `following=1` scope filter on GET /v1/events
// (native following eng spec §7.1). Distinct from
// `events-following.integration.test.ts`, which covers the #763 `followedArtists`
// OVERLAY on the same endpoint — that one annotates rows, this one narrows them.
//
// The filter matches follow rows from EVERY source (manual and both spotify_*
// values), which is the deliberate difference from `taste=1`. It is
// entitlement-gated inline — /v1/events stays a public route — so anonymous
// callers get 401 only when the flag is present.
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
import { subscriptions, userArtistFollows } from '@concert-crawl/db'
import type { ArtistFollowSource } from '@concert-crawl/types'
import { testDb } from '../test/helpers/db.js'
import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

const USER = 'user_following_filter_1'

// Far-future dates so the list endpoint's `date >= today` filter always passes.
const FUTURE_DATE = '2030-06-01'
const LATER_DATE = '2031-06-01'

const signIn = () => {
  authState.current = { userId: USER, sessionClaims: {} }
}

const seedFollow = async (
  artistName: string,
  source: ArtistFollowSource = 'manual',
) => {
  await testDb.insert(userArtistFollows).values({
    userId: USER,
    artistName,
    canonicalName: artistName.toLowerCase().trim(),
    source,
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

interface ListBody {
  success: boolean
  data: {
    data: Array<{ id: string }>
    total: number
    followingApplied: boolean
  }
}

const fetchFollowing = async (extra = '') => {
  const res = await app.request(`/v1/events?following=1${extra}`)
  const body: ListBody & { code?: string; feature?: string } = await res.json()
  return { status: res.status, body }
}

describe('following=1 filter on GET /v1/events', () => {
  beforeEach(async () => {
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
    authState.current = null
  })

  it('rejects anonymous requests carrying the flag with 401', async () => {
    const { status } = await fetchFollowing()
    expect(status).toBe(401)
  })

  // The other half of the same guarantee: /v1/events must stay PUBLIC, so the
  // gate can only fire when the flag is present.
  it('serves an anonymous request without the flag', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body: ListBody = await res.json()
    expect(body.data.total).toBe(1)
    expect(body.data.followingApplied).toBe(false)
  })

  it('403s a free user with the typed entitlement code', async () => {
    signIn()
    const { status, body } = await fetchFollowing()
    expect(status).toBe(403)
    expect(body.code).toBe('entitlement_required')
    expect(body.feature).toBe('following')
  })

  // The gate must run before any filter can short-circuit the handler — an
  // unknown venueSlug used to return a 200 that hid the 401 entirely.
  it('401s anonymously even when another filter would return early', async () => {
    const { status } = await fetchFollowing('&venueSlug=no-such-venue')
    expect(status).toBe(401)
  })

  it('rejects malformed following values with 400', async () => {
    signIn()
    await seedPremium()
    const res = await app.request('/v1/events?following=0')
    expect(res.status).toBe(400)
  })

  it('returns an empty list, not an error, when the user follows nobody', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedPremium()
    signIn()

    const { status, body } = await fetchFollowing()
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(0)
    expect(body.data.data).toEqual([])
    expect(body.data.followingApplied).toBe(true)
  })

  it('narrows to headliner matches and total reflects the filter', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedEvent(venue.id, { artist: 'Some Other Band', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { status, body } = await fetchFollowing()
    expect(status).toBe(200)
    expect(body.data.total).toBe(1)
    expect(body.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('matches via canonical_supporting overlap', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Headliner Act',
      supportingArtists: ['MJ Lenderman'],
      canonicalSupporting: ['mj lenderman'],
      date: FUTURE_DATE,
    })
    await seedEvent(venue.id, { artist: 'Unrelated', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('MJ Lenderman')
    signIn()

    const { body } = await fetchFollowing()
    expect(body.data.data.map((row) => row.id)).toEqual([match.id])
  })

  // Only headliners[0] reaches canonical_artist, so without the
  // canonical_headliners arm the second act on a co-headline bill matches
  // nothing (#1419).
  it('matches via canonical_headliners overlap', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Desert Dwellers',
      title: 'Desert Dwellers & Great Dane',
      canonicalHeadliners: ['desert dwellers', 'great dane'],
      date: FUTURE_DATE,
    })
    await seedEvent(venue.id, { artist: 'Unrelated', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Great Dane')
    signIn()

    const { body } = await fetchFollowing()
    expect(body.data.data.map((row) => row.id)).toEqual([match.id])
  })

  // The deliberate divergence from taste=1, which is scoped to the two
  // spotify_* sources. Following is source-agnostic by design.
  it.each<ArtistFollowSource>(['manual', 'spotify_followed', 'spotify_top'])(
    'counts a %s follow row',
    async (source) => {
      const venue = await seedVenue()
      const match = await seedEvent(venue.id, {
        artist: 'Phoebe Bridgers',
        date: FUTURE_DATE,
      })
      await seedPremium()
      await seedFollow('Phoebe Bridgers', source)
      signIn()

      const { body } = await fetchFollowing()
      expect(body.data.data.map((row) => row.id)).toEqual([match.id])
    },
  )

  it('AND-composes with a date range', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    // Same followed artist, outside the requested window.
    await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      title: 'Phoebe later',
      date: LATER_DATE,
    })
    // Inside the window, but not followed.
    await seedEvent(venue.id, { artist: 'Some Other Band', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await fetchFollowing(
      `&from=${FUTURE_DATE}&to=${FUTURE_DATE}`,
    )
    expect(body.data.total).toBe(1)
    expect(body.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('AND-composes with venueSlug', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' })
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' })
    const match = await seedEvent(venueA.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedEvent(venueB.id, {
      artist: 'Phoebe Bridgers',
      title: 'Phoebe at B',
      date: FUTURE_DATE,
    })
    await seedEvent(venueA.id, { artist: 'Some Other Band', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await fetchFollowing('&venueSlug=venue-a')
    expect(body.data.total).toBe(1)
    expect(body.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('scopes to the requesting viewer, not to anyone who follows', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await testDb.insert(userArtistFollows).values({
      userId: 'user_someone_else',
      artistName: 'Phoebe Bridgers',
      canonicalName: 'phoebe bridgers',
      source: 'manual',
    })
    await seedPremium()
    signIn()

    const { body } = await fetchFollowing()
    expect(body.data.total).toBe(0)
  })
})
