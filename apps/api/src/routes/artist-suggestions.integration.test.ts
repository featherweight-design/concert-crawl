// Integration tests for GET /v1/artists/suggestions (native following, PR 4).
//
// The endpoint exists because the starter shelf had no data source: no
// suggestions route existed, /v1/search/artists requires `q`, and there is no
// follower-count column to order by (Gate 1, decisions D2/D3). The ordering
// contract asserted here — upcoming-show count desc, soonest date asc, name
// asc — IS the substitute for that missing column.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as { userId: string } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import type { ArtistSuggestion } from '@concert-crawl/types'
import { userArtistFollows } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()

interface SuccessBody {
  success: true
  data: ArtistSuggestion[]
}

const getSuggestions = async (query = ''): Promise<Response> =>
  app.request(`/v1/artists/suggestions${query}`)

const readNames = async (res: Response): Promise<string[]> => {
  const body: SuccessBody = await res.json()
  return body.data.map((row) => row.name)
}

describe('GET /v1/artists/suggestions — integration', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('orders by upcoming show count desc, then soonest date asc, then name asc', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })

    // Busy: three upcoming. Should lead on count alone.
    await seedArtist({ name: 'Busy Act', canonicalName: 'busy act' })
    for (const date of ['2099-03-01', '2099-04-01', '2099-05-01']) {
      await seedEvent(venue.id, {
        artist: 'Busy Act',
        canonicalArtist: 'busy act',
        date,
      })
    }

    // Two artists tied at one show each — the earlier date wins the tiebreak.
    await seedArtist({ name: 'Early Act', canonicalName: 'early act' })
    await seedEvent(venue.id, {
      artist: 'Early Act',
      canonicalArtist: 'early act',
      date: '2099-02-01',
    })
    await seedArtist({ name: 'Later Act', canonicalName: 'later act' })
    await seedEvent(venue.id, {
      artist: 'Later Act',
      canonicalArtist: 'later act',
      date: '2099-06-01',
    })

    // Same count AND same date as Later Act — name asc breaks the final tie,
    // which is what makes the ordering deterministic across runs.
    await seedArtist({ name: 'Alpha Act', canonicalName: 'alpha act' })
    await seedEvent(venue.id, {
      artist: 'Alpha Act',
      canonicalArtist: 'alpha act',
      date: '2099-06-01',
    })

    const res = await getSuggestions()
    expect(res.status).toBe(200)
    expect(await readNames(res)).toEqual([
      'Busy Act',
      'Early Act',
      'Alpha Act',
      'Later Act',
    ])
  })

  it('returns nextShow and upcomingShowCount for each row', async () => {
    const venue = await seedVenue({ name: 'Larimer Lounge', slug: 'larimer' })
    await seedArtist({
      name: 'Nightjar Choir',
      canonicalName: 'nightjar choir',
      photoUrl: 'https://i.example.com/nightjar.jpg',
    })
    await seedEvent(venue.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2099-09-02',
    })
    await seedEvent(venue.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2099-08-14',
    })

    const res = await getSuggestions()
    const body: SuccessBody = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      name: 'Nightjar Choir',
      slug: 'nightjar-choir',
      photoUrl: 'https://i.example.com/nightjar.jpg',
      upcomingShowCount: 2,
      following: null,
      nextShow: {
        iso: '2099-08-14',
        venue: 'Larimer Lounge',
        venueSlug: 'larimer',
      },
    })
  })

  it('counts co-headliner and supporting billings, not just canonical_artist', async () => {
    const venue = await seedVenue({ slug: 'hi-dive' })
    await seedArtist({ name: 'Second Act', canonicalName: 'second act' })
    await seedArtist({ name: 'Support Act', canonicalName: 'support act' })

    // Only headliners[0] reaches canonical_artist (#1203), so without the
    // array arms neither of these artists would be suggestable at all.
    await seedEvent(venue.id, {
      artist: 'Lead Act',
      canonicalArtist: 'lead act',
      canonicalHeadliners: ['lead act', 'second act'],
      canonicalSupporting: ['support act'],
      date: '2099-07-04',
    })

    const names = await readNames(await getSuggestions())
    expect(names).toContain('Second Act')
    expect(names).toContain('Support Act')
  })

  it('excludes hidden artists, hidden/stale events, past dates, and inactive venues', async () => {
    const active = await seedVenue({ slug: 'active-venue' })
    const inactive = await seedVenue({ slug: 'inactive-venue', active: false })

    await seedArtist({
      name: 'Hidden Act',
      canonicalName: 'hidden act',
      hidden: true,
    })
    await seedEvent(active.id, {
      artist: 'Hidden Act',
      canonicalArtist: 'hidden act',
      date: '2099-01-01',
    })

    await seedArtist({
      name: 'Consumer Hidden',
      canonicalName: 'consumer hidden',
    })
    await seedEvent(active.id, {
      artist: 'Consumer Hidden',
      canonicalArtist: 'consumer hidden',
      date: '2099-01-01',
      hiddenFromConsumer: true,
    })

    await seedArtist({ name: 'Stale Act', canonicalName: 'stale act' })
    await seedEvent(active.id, {
      artist: 'Stale Act',
      canonicalArtist: 'stale act',
      date: '2099-01-01',
      firstMissingAt: new Date(),
    })

    await seedArtist({ name: 'Past Act', canonicalName: 'past act' })
    await seedEvent(active.id, {
      artist: 'Past Act',
      canonicalArtist: 'past act',
      date: '2020-01-01',
    })

    await seedArtist({
      name: 'Inactive Venue Act',
      canonicalName: 'inactive venue act',
    })
    await seedEvent(inactive.id, {
      artist: 'Inactive Venue Act',
      canonicalArtist: 'inactive venue act',
      date: '2099-01-01',
    })

    await seedArtist({ name: 'Real Act', canonicalName: 'real act' })
    await seedEvent(active.id, {
      artist: 'Real Act',
      canonicalArtist: 'real act',
      date: '2099-01-01',
    })

    expect(await readNames(await getSuggestions())).toEqual(['Real Act'])
  })

  it('keeps cancelled and postponed dates, matching every other list surface', async () => {
    const venue = await seedVenue({ slug: 'ogden' })
    await seedArtist({ name: 'Cancelled Act', canonicalName: 'cancelled act' })
    await seedEvent(venue.id, {
      artist: 'Cancelled Act',
      canonicalArtist: 'cancelled act',
      date: '2099-01-01',
      status: 'cancelled',
    })

    expect(await readNames(await getSuggestions())).toEqual(['Cancelled Act'])
  })

  it('stamps following per row for an authed viewer and ignores spotify_top', async () => {
    const venue = await seedVenue({ slug: 'bluebird' })
    for (const name of ['Followed Act', 'Listened Act', 'Unknown Act']) {
      await seedArtist({ name, canonicalName: name.toLowerCase() })
      await seedEvent(venue.id, {
        artist: name,
        canonicalArtist: name.toLowerCase(),
        date: '2099-01-01',
      })
    }

    await testDb.insert(userArtistFollows).values([
      {
        userId: 'user_suggest',
        canonicalName: 'followed act',
        artistName: 'Followed Act',
        source: 'manual',
      },
      // Listening history is not a follow — counting it would render the badge
      // pre-engaged for an artist the user never followed.
      {
        userId: 'user_suggest',
        canonicalName: 'listened act',
        artistName: 'Listened Act',
        source: 'spotify_top',
      },
    ])

    authState.current = { userId: 'user_suggest' }
    const body: SuccessBody = await (await getSuggestions()).json()
    const byName = new Map(body.data.map((row) => [row.name, row.following]))
    expect(byName.get('Followed Act')).toBe(true)
    expect(byName.get('Listened Act')).toBe(false)
    expect(byName.get('Unknown Act')).toBe(false)
  })

  it('honours ?limit= and rejects one over the cap', async () => {
    const venue = await seedVenue({ slug: 'marquis' })
    for (const name of ['Aa Act', 'Bb Act', 'Cc Act']) {
      await seedArtist({ name, canonicalName: name.toLowerCase() })
      await seedEvent(venue.id, {
        artist: name,
        canonicalArtist: name.toLowerCase(),
        date: '2099-01-01',
      })
    }

    expect(await readNames(await getSuggestions('?limit=2'))).toEqual([
      'Aa Act',
      'Bb Act',
    ])
    expect((await getSuggestions('?limit=99')).status).toBe(400)
    expect((await getSuggestions('?limit=0')).status).toBe(400)
  })

  it('is not shadowed by GET /:slug', async () => {
    // `suggestions` satisfies the slug param schema, so a route-order
    // regression would answer 404 here rather than an empty list.
    const res = await getSuggestions()
    expect(res.status).toBe(200)
  })
})
