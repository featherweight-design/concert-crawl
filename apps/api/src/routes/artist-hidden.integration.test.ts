// #1342 — a hidden artist must disappear from EVERY public surface, not just
// the detail route.
//
// This file exists as one sweep rather than four additions to four suites
// because the failure mode is a surface being *missed*: the projection feeds
// the detail page, search, the event-detail link resolver and the follow
// write, and hiding a row from three of them still leaves a live path to a
// festival ticket package. A single list of surfaces is the thing a future
// entry point gets added to.
import { describe, it, expect, beforeEach, vi } from 'vitest'

interface AuthState {
  current: { userId: string } | null
}

const { authState } = vi.hoisted((): { authState: AuthState } => ({
  authState: { current: null },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { and, eq } from 'drizzle-orm'
import { userArtistFollows } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { resolveArtistSlugs } from '../lib/artist-slugs.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()

const HIDDEN_NAME = 'Ghost Canyon (Weekend Passes)'
const HIDDEN_CANONICAL = 'ghost canyon (weekend passes)'
const VISIBLE_NAME = 'Mountain Grass Unit'

interface SearchBody {
  success: boolean
  data: Array<{ slug: string; name: string }>
}

/**
 * One hidden artist and one visible one, both with an upcoming show at the
 * same venue, so every assertion below distinguishes "excluded because hidden"
 * from "excluded because the query returned nothing".
 */
const seedPair = async (): Promise<{ hiddenSlug: string }> => {
  const venue = await seedVenue()
  const hidden = await seedArtist({
    name: HIDDEN_NAME,
    canonicalName: HIDDEN_CANONICAL,
    hidden: true,
  })
  await seedArtist({
    name: VISIBLE_NAME,
    canonicalName: 'mountain grass unit',
  })
  await seedEvent(venue.id, {
    artist: HIDDEN_NAME,
    canonicalArtist: HIDDEN_CANONICAL,
    date: '2099-06-01',
  })
  await seedEvent(venue.id, {
    artist: VISIBLE_NAME,
    canonicalArtist: 'mountain grass unit',
    date: '2099-06-02',
  })
  return { hiddenSlug: hidden.slug }
}

describe('#1342 hidden artists are absent from every public surface', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('404s the detail route, identically to an unknown slug', async () => {
    const { hiddenSlug } = await seedPair()

    const hiddenRes = await app.request(`/v1/artists/${hiddenSlug}`)
    const unknownRes = await app.request('/v1/artists/no-such-artist-at-all')

    expect(hiddenRes.status).toBe(404)
    expect(await hiddenRes.json()).toEqual(await unknownRes.json())
  })

  it('omits the row from artist search while still returning visible hits', async () => {
    await seedPair()

    const hiddenHit = await app.request('/v1/search/artists?q=ghost')
    const visibleHit = await app.request('/v1/search/artists?q=mountain')

    const hiddenBody: SearchBody = await hiddenHit.json()
    const visibleBody: SearchBody = await visibleHit.json()

    expect(hiddenBody.data).toEqual([])
    // The control: search itself works, so the empty result above is the
    // hidden filter and not a broken query.
    expect(visibleBody.data).toHaveLength(1)
  })

  it('resolves the event-detail link to null so the name renders as plain text', async () => {
    await seedPair()

    const resolved = await resolveArtistSlugs(HIDDEN_NAME, [VISIBLE_NAME])

    expect(resolved.artistSlug).toBeNull()
    expect(resolved.supportingArtistSlugs).toEqual([
      expect.stringContaining('mountain-grass-unit'),
    ])
  })

  it('refuses a new follow but still allows unfollowing an existing one', async () => {
    const { hiddenSlug } = await seedPair()
    authState.current = { userId: 'user_hidden_test' }

    const follow = await app.request(`/v1/artists/${hiddenSlug}/follow`, {
      method: 'POST',
    })
    expect(follow.status).toBe(404)

    // A row followed before the admin hid it. Leaving the user unable to
    // unfollow would strand them with a follow they can no longer see or
    // reach.
    await testDb.insert(userArtistFollows).values({
      userId: 'user_hidden_test',
      artistName: HIDDEN_NAME,
      canonicalName: HIDDEN_CANONICAL,
      source: 'manual',
    })

    const unfollow = await app.request(`/v1/artists/${hiddenSlug}/follow`, {
      method: 'DELETE',
    })
    expect(unfollow.status).toBe(200)

    const remaining = await testDb
      .select()
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, 'user_hidden_test'),
          eq(userArtistFollows.canonicalName, HIDDEN_CANONICAL),
        ),
      )
    expect(remaining).toEqual([])
  })
})
