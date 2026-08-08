// Integration tests for the viewer-scoped follow collection (native following
// eng spec §7.5, §9.3):
//   GET  /v1/me/artist-follows       — ungated on purpose (downgrade case)
//   POST /v1/me/artist-follows/bulk  — requireFeature('following') gated
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
import type {
  ArtistFollowSource,
  BulkFollowResponse,
  FollowedArtist,
} from '@concert-crawl/types'
import { testDb } from '../test/helpers/db.js'
import { createApp } from '../app.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()

const USER = 'user_me_follows_1'

const FUTURE_DATE = '2030-06-01'
const LATER_DATE = '2031-06-01'
const PAST_DATE = '2020-06-01'

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

const fetchList = async () => {
  const res = await app.request('/v1/me/artist-follows')
  const body: { success: boolean; data: FollowedArtist[] } = await res.json()
  return { status: res.status, body }
}

const postBulk = async (slugs: unknown) => {
  const res = await app.request('/v1/me/artist-follows/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slugs }),
  })
  const body: {
    success: boolean
    data?: BulkFollowResponse
    code?: string
    feature?: string
  } = await res.json()
  return { status: res.status, body }
}

beforeEach(async () => {
  await clearTables()
  await testDb.execute(sql`TRUNCATE subscriptions, gifted_comps, user_billing`)
  authState.current = null
})

describe('GET /v1/me/artist-follows', () => {
  it('401s an anonymous request', async () => {
    const { status } = await fetchList()
    expect(status).toBe(401)
  })

  // The downgrade case, and the reason this route carries no requireFeature:
  // a user who lapses to free must still be able to see and manage the list
  // they built while paying.
  it('succeeds for a FREE-tier user without a 403', async () => {
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { status, body } = await fetchList()
    expect(status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.name).toBe('Phoebe Bridgers')
  })

  it('returns an empty array when the user follows nobody', async () => {
    signIn()
    const { status, body } = await fetchList()
    expect(status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('carries the follow source and a page slug when the artist has one', async () => {
    await seedArtist({
      name: 'Phoebe Bridgers',
      photoUrl: 'https://img/pb.jpg',
    })
    await seedFollow('Phoebe Bridgers', 'spotify_top')
    signIn()

    const { body } = await fetchList()
    const [row] = body.data
    expect(row?.source).toBe('spotify_top')
    expect(row?.slug).toBe('phoebe-bridgers')
    expect(row?.photoUrl).toBe('https://img/pb.jpg')
    expect(row?.canonicalName).toBe('phoebe bridgers')
    expect(typeof row?.followedAt).toBe('string')
  })

  // A Spotify-synced follow for an act never billed in Denver has no
  // projection row, so there is nothing to link to. Not an error.
  it('returns a null slug when no projection row exists', async () => {
    await seedFollow('Never Played Denver')
    signIn()

    const { body } = await fetchList()
    expect(body.data[0]?.slug).toBeNull()
    expect(body.data[0]?.photoUrl).toBeNull()
  })

  it('returns a null nextShow for a followed artist with no upcoming show', async () => {
    const venue = await seedVenue()
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: PAST_DATE })
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { status, body } = await fetchList()
    expect(status).toBe(200)
    expect(body.data[0]?.nextShow).toBeNull()
  })

  it('returns the EARLIEST upcoming show as nextShow', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    await seedArtist({ name: 'Phoebe Bridgers' })
    const soonest = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    })
    await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      title: 'Phoebe later',
      date: LATER_DATE,
    })
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await fetchList()
    expect(body.data[0]?.nextShow).toEqual({
      eventId: soonest.id,
      iso: FUTURE_DATE,
      venue: 'Globe Hall',
      venueSlug: 'globe-hall',
    })
  })

  it('ignores a hidden-from-consumer show when picking nextShow', async () => {
    const venue = await seedVenue()
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
      hiddenFromConsumer: true,
    })
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await fetchList()
    expect(body.data[0]?.nextShow).toBeNull()
  })

  it('scopes to the requesting viewer', async () => {
    await testDb.insert(userArtistFollows).values({
      userId: 'user_someone_else',
      artistName: 'Phoebe Bridgers',
      canonicalName: 'phoebe bridgers',
      source: 'manual',
    })
    signIn()

    const { body } = await fetchList()
    expect(body.data).toEqual([])
  })
})

describe('POST /v1/me/artist-follows/bulk', () => {
  it('401s an anonymous request', async () => {
    const { status } = await postBulk(['phoebe-bridgers'])
    expect(status).toBe(401)
  })

  it('403s a free-tier user with the typed entitlement code', async () => {
    await seedArtist({ name: 'Phoebe Bridgers' })
    signIn()

    const { status, body } = await postBulk(['phoebe-bridgers'])
    expect(status).toBe(403)
    expect(body.code).toBe('entitlement_required')
    expect(body.feature).toBe('following')
  })

  it('rejects a malformed body with 400', async () => {
    await seedPremium()
    signIn()

    expect((await postBulk([])).status).toBe(400)
    expect((await postBulk('phoebe-bridgers')).status).toBe(400)
    expect((await postBulk(['Not A Slug'])).status).toBe(400)
  })

  it('rejects a slug list over the cap with 400', async () => {
    await seedPremium()
    signIn()

    const tooMany = Array.from({ length: 51 }, (_, i) => `artist-${i}`)
    expect((await postBulk(tooMany)).status).toBe(400)
  })

  it('follows every matched slug and reports per-slug results', async () => {
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedArtist({ name: 'MJ Lenderman' })
    await seedPremium()
    signIn()

    const { status, body } = await postBulk([
      'phoebe-bridgers',
      'mj-lenderman',
      'no-such-artist',
    ])
    expect(status).toBe(200)
    expect(body.data?.followedCount).toBe(2)
    expect(body.data?.results).toEqual([
      { slug: 'phoebe-bridgers', status: 'followed' },
      { slug: 'mj-lenderman', status: 'followed' },
      { slug: 'no-such-artist', status: 'artist_not_found' },
    ])

    const rows = await testDb.select().from(userArtistFollows)
    expect(rows).toHaveLength(2)
  })

  // Idempotence: re-committing a selection that half landed is a success, not
  // a conflict.
  it('is idempotent on a repeat call', async () => {
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedPremium()
    signIn()

    const first = await postBulk(['phoebe-bridgers'])
    expect(first.body.data?.followedCount).toBe(1)

    const second = await postBulk(['phoebe-bridgers'])
    expect(second.status).toBe(200)
    expect(second.body.data?.followedCount).toBe(0)
    expect(second.body.data?.results).toEqual([
      { slug: 'phoebe-bridgers', status: 'already_following' },
    ])

    const rows = await testDb.select().from(userArtistFollows)
    expect(rows).toHaveLength(1)
  })

  it('dedupes a repeated slug within one body', async () => {
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedPremium()
    signIn()

    const { body } = await postBulk(['phoebe-bridgers', 'phoebe-bridgers'])
    expect(body.data?.results).toEqual([
      { slug: 'phoebe-bridgers', status: 'followed' },
    ])
    expect(body.data?.followedCount).toBe(1)
  })

  it('reports a hidden artist as not found', async () => {
    await seedArtist({ name: 'Phoebe Bridgers', hidden: true })
    await seedPremium()
    signIn()

    const { body } = await postBulk(['phoebe-bridgers'])
    expect(body.data?.results).toEqual([
      { slug: 'phoebe-bridgers', status: 'artist_not_found' },
    ])
    expect(body.data?.followedCount).toBe(0)
  })

  it('rows written by bulk read back on the list endpoint', async () => {
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedPremium()
    signIn()

    await postBulk(['phoebe-bridgers'])
    const { body } = await fetchList()
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.source).toBe('manual')
    expect(body.data[0]?.slug).toBe('phoebe-bridgers')
  })
})
