// Integration tests for the `taste=1` filter on GET /v1/events (#763 PR 7,
// eng spec §9.3). The flag narrows the list to events matching the viewer's
// Spotify-sourced follow rows (headliner OR supporting overlap, §9.1) and is
// entitlement-gated: anonymous → 401, signed-in without the spotify-sync
// feature → 403 entitlement_required. The condition AND-composes with every
// existing filter and applies to both `total` and the returned rows.
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
import { testDb } from '../test/helpers/db.js'
import { createApp } from '../app.js'
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js'

const app = createApp()

const USER = 'user_taste_1'

// Far-future date so the list endpoint's `date >= today` filter always passes.
const FUTURE_DATE = '2030-06-01'

const signIn = (role?: string) => {
  authState.current = {
    userId: USER,
    sessionClaims: role ? { metadata: { role } } : {},
  }
}

const seedFollow = async (
  artistName: string,
  source: 'spotify_followed' | 'spotify_top' | 'manual' = 'spotify_followed',
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
  data: { data: Array<{ id: string }>; total: number }
}

const fetchTaste = async (extra = '') => {
  const res = await app.request(`/v1/events?taste=1${extra}`)
  const body = await res.json()
  return { status: res.status, body }
}

describe('taste filter on GET /v1/events (#763 PR 7)', () => {
  beforeEach(async () => {
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
    authState.current = null
  })

  it('rejects anonymous requests with 401', async () => {
    const { status } = await fetchTaste()
    expect(status).toBe(401)
  })

  it('403s a free user with the typed entitlement code', async () => {
    signIn()
    const { status, body } = await fetchTaste()
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
    const { status } = await fetchTaste()
    expect(status).toBe(403)
  })

  it('rejects malformed taste values with 400', async () => {
    signIn()
    await seedPremium()
    const res = await app.request('/v1/events?taste=0')
    expect(res.status).toBe(400)
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

    const { status, body } = await fetchTaste()
    expect(status).toBe(200)
    const list: ListBody = body
    expect(list.data.total).toBe(1)
    expect(list.data.data.map((row) => row.id)).toEqual([match.id])
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
    await seedFollow('MJ Lenderman', 'spotify_top')
    signIn()

    const { body } = await fetchTaste()
    const list: ListBody = body
    expect(list.data.data.map((row) => row.id)).toEqual([match.id])
  })

  // Only headliners[0] reaches canonical_artist, so without the
  // canonical_headliners arm the second act on a co-headline bill matched
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

    const { body } = await fetchTaste()
    const list: ListBody = body
    expect(list.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('AND-composes with other filters (venueSlug)', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' })
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' })
    const match = await seedEvent(venueA.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    // Followed artist at the OTHER venue — must be excluded by venueSlug.
    await seedEvent(venueB.id, {
      artist: 'Phoebe Bridgers',
      title: 'Phoebe at B',
      date: FUTURE_DATE,
    })
    // Unfollowed artist at venue A — must be excluded by taste.
    await seedEvent(venueA.id, { artist: 'Some Other Band', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await fetchTaste('&venueSlug=venue-a')
    const list: ListBody = body
    expect(list.data.total).toBe(1)
    expect(list.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('manual follow rows do not count toward taste', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers', 'manual')
    signIn()

    const { status, body } = await fetchTaste()
    expect(status).toBe(200)
    const list: ListBody = body
    expect(list.data.total).toBe(0)
    expect(list.data.data).toEqual([])
  })

  it('entitled user with no Spotify rows gets an empty 200', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedPremium()
    signIn()

    const { status, body } = await fetchTaste()
    expect(status).toBe(200)
    const list: ListBody = body
    expect(list.data.total).toBe(0)
  })

  it('roleComped users pass the gate without billing rows', async () => {
    const venue = await seedVenue()
    const match = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedFollow('Phoebe Bridgers')
    signIn('admin')

    const { status, body } = await fetchTaste()
    expect(status).toBe(200)
    const list: ListBody = body
    expect(list.data.data.map((row) => row.id)).toEqual([match.id])
  })

  it('requests without the flag are unchanged', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedEvent(venue.id, { artist: 'Some Other Band', date: FUTURE_DATE })
    await seedPremium()
    await seedFollow('Phoebe Bridgers')
    signIn()

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.total).toBe(2)
  })
})
