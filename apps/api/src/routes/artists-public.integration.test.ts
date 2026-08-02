// Integration tests for GET /v1/artists/:slug (#1115, PR-D).
//
// The load-bearing contract asserted here is `history.count === past.length`:
// the page renders the history sentence from `history` and the list from
// `past`, so any drift makes the page contradict itself.
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
  data: ArtistDetailResponse
}

interface ErrorBody {
  success: false
  error: string
}

const getArtist = async (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}`)

describe('GET /v1/artists/:slug — integration', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('returns artist detail with ascending upcoming, descending past, and a history drawn from past', async () => {
    await seedArtist({
      name: 'Nightjar Choir',
      canonicalName: 'nightjar choir',
      spotifyArtistId: 'sp_nightjar',
      photoUrl: 'https://i.example.com/nightjar.jpg',
    })
    const larimer = await seedVenue({
      name: 'Larimer Lounge',
      slug: 'larimer-lounge',
      city: 'Denver',
    })
    const globe = await seedVenue({
      name: 'Globe Hall',
      slug: 'globe-hall',
      city: 'Denver',
    })

    // Two upcoming, seeded out of order to prove the ORDER BY.
    await seedEvent(globe.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2099-09-02',
      showTime: '20:00:00',
      ticketPriceMin: '22.00',
    })
    await seedEvent(larimer.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2099-08-14',
      showTime: '19:00:00',
      ticketPriceMin: '28.00',
    })

    // Three past across two venues, most recent at Larimer.
    await seedEvent(larimer.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2020-06-21',
    })
    await seedEvent(globe.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2020-05-09',
    })
    await seedEvent(larimer.id, {
      artist: 'Nightjar Choir',
      canonicalArtist: 'nightjar choir',
      date: '2020-03-28',
    })

    const res = await getArtist('nightjar-choir')
    expect(res.status).toBe(200)
    const body: SuccessBody = await res.json()
    expect(body.success).toBe(true)

    expect(body.data.artist).toEqual({
      name: 'Nightjar Choir',
      slug: 'nightjar-choir',
      spotifyArtistId: 'sp_nightjar',
      photoUrl: 'https://i.example.com/nightjar.jpg',
    })

    expect(body.data.shows.map((show) => show.iso)).toEqual([
      '2099-08-14',
      '2099-09-02',
    ])
    expect(body.data.shows[0]).toMatchObject({
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      city: 'Denver',
      price: 28,
      showTime: '19:00:00',
    })

    expect(body.data.past.map((show) => show.iso)).toEqual([
      '2020-06-21',
      '2020-05-09',
      '2020-03-28',
    ])

    expect(body.data.history.count).toBe(3)
    expect(body.data.history.count).toBe(body.data.past.length)
    // Deduped, first-seen (most-recent-first) order.
    expect(body.data.history.venues).toEqual(['Larimer Lounge', 'Globe Hall'])
    expect(body.data.following).toBeNull()
  })

  it('returns an artist with no shows at all', async () => {
    await seedArtist({
      name: 'Quiet Signal',
      canonicalName: 'quiet signal',
    })

    const res = await getArtist('quiet-signal')
    expect(res.status).toBe(200)
    const body: SuccessBody = await res.json()
    expect(body.data.shows).toEqual([])
    expect(body.data.past).toEqual([])
    expect(body.data.history).toEqual({ count: 0, venues: [] })
  })

  it('includes shows where the artist appears only as a supporting act', async () => {
    await seedArtist({
      name: 'Wax Harbour',
      canonicalName: 'wax harbour',
    })
    const venue = await seedVenue({ name: 'Hi-Dive', slug: 'hi-dive' })

    await seedEvent(venue.id, {
      artist: 'Someone Else',
      canonicalArtist: 'someone else',
      canonicalSupporting: ['wax harbour', 'third act'],
      date: '2099-07-04',
    })
    await seedEvent(venue.id, {
      artist: 'Someone Else',
      canonicalArtist: 'someone else',
      canonicalSupporting: ['wax harbour'],
      date: '2020-02-02',
    })

    const res = await getArtist('wax-harbour')
    expect(res.status).toBe(200)
    const body: SuccessBody = await res.json()
    expect(body.data.shows.map((show) => show.iso)).toEqual(['2099-07-04'])
    expect(body.data.past.map((show) => show.iso)).toEqual(['2020-02-02'])
    expect(body.data.history.count).toBe(1)
  })

  it('excludes hidden and stale events from both lists and from history.count', async () => {
    await seedArtist({
      name: 'Filtered Act',
      canonicalName: 'filtered act',
    })
    const venue = await seedVenue({ name: 'Lost Lake', slug: 'lost-lake' })

    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2099-07-01',
    })
    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2099-07-02',
      hiddenFromConsumer: true,
    })
    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2099-07-03',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })
    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2020-01-01',
    })
    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2020-01-02',
      hiddenFromConsumer: true,
    })
    await seedEvent(venue.id, {
      artist: 'Filtered Act',
      canonicalArtist: 'filtered act',
      date: '2020-01-03',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await getArtist('filtered-act')
    const body: SuccessBody = await res.json()
    expect(body.data.shows.map((show) => show.iso)).toEqual(['2099-07-01'])
    expect(body.data.past.map((show) => show.iso)).toEqual(['2020-01-01'])
    expect(body.data.history.count).toBe(1)
    expect(body.data.history.count).toBe(body.data.past.length)
  })

  it('drops a cancelled past show from history but keeps a postponed one', async () => {
    await seedArtist({
      name: 'Called Off',
      canonicalName: 'called off',
    })
    const venue = await seedVenue({ name: 'Bluebird', slug: 'bluebird' })

    await seedEvent(venue.id, {
      artist: 'Called Off',
      canonicalArtist: 'called off',
      date: '2020-02-01',
    })
    // Never happened, so it is not one of the times we caught them.
    await seedEvent(venue.id, {
      artist: 'Called Off',
      canonicalArtist: 'called off',
      date: '2020-02-02',
      status: 'cancelled',
    })
    // The date moved, but the show still landed on our map.
    await seedEvent(venue.id, {
      artist: 'Called Off',
      canonicalArtist: 'called off',
      date: '2020-02-03',
      status: 'postponed',
    })

    const res = await getArtist('called-off')
    const body: SuccessBody = await res.json()
    expect(body.data.past.map((show) => show.iso)).toEqual([
      '2020-02-03',
      '2020-02-01',
    ])
    expect(body.data.history.count).toBe(2)
  })

  it('returns following: null when anonymous and a boolean when signed in', async () => {
    await seedArtist({
      name: 'Followed Act',
      canonicalName: 'followed act',
    })

    const anon: SuccessBody = await (await getArtist('followed-act')).json()
    expect(anon.data.following).toBeNull()

    authState.current = { userId: 'user_artist_read' }
    const notFollowing: SuccessBody = await (
      await getArtist('followed-act')
    ).json()
    expect(notFollowing.data.following).toBe(false)

    await testDb.insert(userArtistFollows).values({
      userId: 'user_artist_read',
      artistName: 'Followed Act',
      canonicalName: 'followed act',
      source: 'manual',
    })

    const following: SuccessBody = await (
      await getArtist('followed-act')
    ).json()
    expect(following.data.following).toBe(true)
  })

  it('counts a Spotify-sourced follow as following', async () => {
    await seedArtist({
      name: 'Synced Act',
      canonicalName: 'synced act',
    })
    authState.current = { userId: 'user_artist_sync' }
    await testDb.insert(userArtistFollows).values({
      userId: 'user_artist_sync',
      artistName: 'Synced Act',
      canonicalName: 'synced act',
      spotifyArtistId: 'sp_synced',
      source: 'spotify_followed',
    })

    const body: SuccessBody = await (await getArtist('synced-act')).json()
    expect(body.data.following).toBe(true)
  })

  it('keeps history.count equal to past.length when the past cap truncates', async () => {
    await seedArtist({
      name: 'Prolific Act',
      canonicalName: 'prolific act',
    })
    const venue = await seedVenue({ name: 'Ophelias', slug: 'ophelias' })

    // 51 past shows — one more than PAST_LIMIT. A separate COUNT(*) would say
    // 51 while the list rendered 50; deriving from the rows cannot drift.
    for (let i = 0; i < 51; i += 1) {
      await seedEvent(venue.id, {
        artist: 'Prolific Act',
        canonicalArtist: 'prolific act',
        date: `2020-01-${String((i % 28) + 1).padStart(2, '0')}`,
        showTime: `${String(i % 24).padStart(2, '0')}:00:00`,
        title: `Prolific Act night ${i}`,
        canonicalTitle: `prolific act night ${i}`,
      })
    }

    const body: SuccessBody = await (await getArtist('prolific-act')).json()
    expect(body.data.past).toHaveLength(50)
    expect(body.data.history.count).toBe(body.data.past.length)
  })

  it('404s an unknown slug', async () => {
    const res = await getArtist('nobody-here')
    expect(res.status).toBe(404)
    const body: ErrorBody = await res.json()
    expect(body).toEqual({ success: false, error: 'Artist not found' })
  })

  it('404s a malformed slug without reaching the database', async () => {
    const res = await getArtist('Not%20A%20Slug')
    expect(res.status).toBe(404)
    const body: ErrorBody = await res.json()
    expect(body).toEqual({ success: false, error: 'Artist not found' })
  })
})
