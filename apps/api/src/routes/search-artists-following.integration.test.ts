// Integration tests for the `following` flag on GET /v1/search/artists (native
// following eng spec §7.4). Lives in its own file because
// `search.integration.test.ts` mocks getAuth to a flat `null` module-wide, so
// it can only exercise the anonymous path.
//
// The route stays PUBLIC — an anonymous caller still gets results, just with
// `following: false` on every row.
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

import { userArtistFollows } from '@concert-crawl/db'
import type {
  ArtistFollowSource,
  ArtistSearchResult,
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

const USER = 'user_search_following_1'
const FUTURE_DATE = '2030-06-01'

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

const search = async (query: string) => {
  const res = await app.request(
    `/v1/search/artists?q=${encodeURIComponent(query)}`,
  )
  const body: { success: boolean; data: ArtistSearchResult[] } =
    await res.json()
  return { status: res.status, body }
}

describe('following flag on GET /v1/search/artists', () => {
  beforeEach(async () => {
    await clearTables()
    authState.current = null

    // Both artists need at least one consumer-visible event or the route
    // filters them out of search entirely.
    const venue = await seedVenue()
    await seedArtist({ name: 'Phoebe Bridgers' })
    await seedArtist({ name: 'Phoebe Rings' })
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE })
    await seedEvent(venue.id, { artist: 'Phoebe Rings', date: FUTURE_DATE })
  })

  it('reads false on every row for an anonymous caller', async () => {
    const { status, body } = await search('phoebe')
    expect(status).toBe(200)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data.every((row) => row.following === false)).toBe(true)
  })

  it('stamps following only on the artists the viewer follows', async () => {
    await seedFollow('Phoebe Bridgers')
    signIn()

    const { body } = await search('phoebe')
    const byName = new Map(body.data.map((row) => [row.name, row.following]))
    expect(byName.get('Phoebe Bridgers')).toBe(true)
    expect(byName.get('Phoebe Rings')).toBe(false)
  })

  // Source-agnostic by design: a Spotify-synced follow and a native one are
  // the same product concept.
  it.each<ArtistFollowSource>(['manual', 'spotify_followed', 'spotify_top'])(
    'counts a %s follow row',
    async (source) => {
      await seedFollow('Phoebe Bridgers', source)
      signIn()

      const { body } = await search('phoebe bridgers')
      expect(body.data[0]?.following).toBe(true)
    },
  )

  it('does not leak another user’s follows', async () => {
    await testDb.insert(userArtistFollows).values({
      userId: 'user_someone_else',
      artistName: 'Phoebe Bridgers',
      canonicalName: 'phoebe bridgers',
      source: 'manual',
    })
    signIn()

    const { body } = await search('phoebe')
    expect(body.data.every((row) => row.following === false)).toBe(true)
  })
})
