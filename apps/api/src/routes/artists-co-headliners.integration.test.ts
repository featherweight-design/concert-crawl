// Integration tests for co-headliner attribution on GET /v1/artists/:slug
// (#1203). Before `canonical_headliners` existed, a co-headline bill was
// flattened into one `artist` string and the second headliner was dumped into
// `supporting_artists` — so that act was either absent from their own page or
// rendered as an opener. The contract asserted here is that BOTH headliners
// resolve to the same show, without disturbing genuine openers.
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

import type { ArtistDetailResponse } from '@concert-crawl/types'
import { createApp } from '../app.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()

interface SuccessBody {
  success: true
  data: ArtistDetailResponse
}

const getArtist = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}`)

describe('artist attribution for co-headline bills — integration', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('bills a co-headline show on BOTH headliners’ pages', async () => {
    await seedArtist({
      name: 'Desert Dwellers',
      canonicalName: 'desert dwellers',
    })
    await seedArtist({ name: 'Great Dane', canonicalName: 'great dane' })
    const venue = await seedVenue({
      name: 'Cervantes',
      slug: 'cervantes-coheadline',
      city: 'Denver',
    })

    // The crawler's shape for a genuine co-headline: `artist` (and therefore
    // canonical_artist) is headliners[0]; the second act only ever appears in
    // the headliners arrays.
    await seedEvent(venue.id, {
      title: 'Desert Dwellers & Great Dane',
      artist: 'Desert Dwellers',
      canonicalArtist: 'desert dwellers',
      headliners: ['Desert Dwellers', 'Great Dane'],
      canonicalHeadliners: ['desert dwellers', 'great dane'],
      date: '2099-10-04',
      showTime: '21:00:00',
    })

    const primary: SuccessBody = await (
      await getArtist('desert-dwellers')
    ).json()
    expect(primary.data.shows.map((show) => show.iso)).toEqual(['2099-10-04'])

    // The regression this PR exists to close: the second headliner used to
    // 404 (or show up as an opener elsewhere).
    const coHeadlinerRes = await getArtist('great-dane')
    expect(coHeadlinerRes.status).toBe(200)
    const coHeadliner: SuccessBody = await coHeadlinerRes.json()
    expect(coHeadliner.data.shows.map((show) => show.iso)).toEqual([
      '2099-10-04',
    ])
    expect(coHeadliner.data.artist.name).toBe('Great Dane')
  })

  it('still resolves a supporting act through canonical_supporting', async () => {
    await seedArtist({ name: 'Hilary Duff', canonicalName: 'hilary duff' })
    await seedArtist({ name: 'La Roux', canonicalName: 'la roux' })
    const venue = await seedVenue({
      name: 'Mission Ballroom',
      slug: 'mission-coheadline',
      city: 'Denver',
    })

    // One headliner, one genuine opener — the overwhelmingly common shape.
    await seedEvent(venue.id, {
      title: 'Hilary Duff with La Roux',
      artist: 'Hilary Duff',
      canonicalArtist: 'hilary duff',
      headliners: ['Hilary Duff'],
      canonicalHeadliners: ['hilary duff'],
      supportingArtists: ['La Roux'],
      canonicalSupporting: ['la roux'],
      date: '2099-11-12',
      showTime: '20:00:00',
    })

    const opener: SuccessBody = await (await getArtist('la-roux')).json()
    expect(opener.data.shows.map((show) => show.iso)).toEqual(['2099-11-12'])

    const headliner: SuccessBody = await (await getArtist('hilary-duff')).json()
    expect(headliner.data.shows.map((show) => show.iso)).toEqual(['2099-11-12'])
  })

  it('serves rows predating the backfill, where both headliner arrays are NULL', async () => {
    // `= ANY(NULL)` is NULL, not false — so the canonical_artist arm has to
    // carry these rows on its own.
    await seedArtist({ name: 'Old Row Band', canonicalName: 'old row band' })
    const venue = await seedVenue({
      name: 'Bluebird',
      slug: 'bluebird-coheadline',
      city: 'Denver',
    })
    await seedEvent(venue.id, {
      artist: 'Old Row Band',
      canonicalArtist: 'old row band',
      headliners: null,
      canonicalHeadliners: null,
      date: '2099-12-01',
    })

    const body: SuccessBody = await (await getArtist('old-row-band')).json()
    expect(body.data.shows.map((show) => show.iso)).toEqual(['2099-12-01'])
  })

  it('does not attribute a show to an act whose name merely contains an ampersand', async () => {
    // "Iron & Wine" is ONE act. Nothing in the pipeline splits on punctuation,
    // so a hypothetical "Wine" artist must not inherit the bill.
    await seedArtist({ name: 'Iron & Wine', canonicalName: 'iron & wine' })
    await seedArtist({ name: 'Wine', canonicalName: 'wine' })
    const venue = await seedVenue({
      name: 'Ogden',
      slug: 'ogden-coheadline',
      city: 'Denver',
    })
    await seedEvent(venue.id, {
      artist: 'Iron & Wine',
      canonicalArtist: 'iron & wine',
      headliners: ['Iron & Wine'],
      canonicalHeadliners: ['iron & wine'],
      date: '2099-07-07',
    })

    const whole: SuccessBody = await (await getArtist('iron-wine')).json()
    expect(whole.data.shows.map((show) => show.iso)).toEqual(['2099-07-07'])

    // No shows at all → the artist page 404s (#1343).
    const fragment = await getArtist('wine')
    expect(fragment.status).toBe(404)
  })
})
