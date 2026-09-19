import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedArtist,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/search/popular', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns 200 without auth', async () => {
    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
  })

  it('returns top 5 upcoming events ordered by watcher count descending', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })

    const eventA = await seedEvent(venue.id, {
      title: 'Show A',
      artist: 'Artist A',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-01',
    })
    const eventB = await seedEvent(venue.id, {
      title: 'Show B',
      artist: 'Artist B',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-02',
    })
    const eventC = await seedEvent(venue.id, {
      title: 'Show C',
      artist: 'Artist C',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-03',
    })

    // eventC gets 3 watchers, eventA gets 1
    await seedUserEvent('user-1', eventC.id, { status: 'watching' })
    await seedUserEvent('user-2', eventC.id, { status: 'watching' })
    await seedUserEvent('user-3', eventC.id, { status: 'watching' })
    await seedUserEvent('user-4', eventA.id, { status: 'watching' })

    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        title: string
        watcherCount: number
        venue: { name: string; slug: string }
      }[]
    }

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(3)
    expect(body.data[0]?.title).toBe('Show C')
    expect(body.data[0]?.watcherCount).toBe(3)
    expect(body.data[1]?.title).toBe('Show A')
    expect(body.data[0]?.venue.name).toBe('Globe Hall')
    expect(body.data[0]?.venue.slug).toBe('globe-hall')
  })

  it('falls back to soonest events when no watchers exist', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    await seedEvent(venue.id, { title: 'Show A', date: '2027-06-01' })
    await seedEvent(venue.id, { title: 'Show B', date: '2027-06-02' })

    const res = await app.request('/v1/search/popular')
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; watcherCount: number }[]
    }

    expect(body.data).toHaveLength(2)
    expect(body.data[0]?.watcherCount).toBe(0)
    expect(body.data[0]?.title).toBe('Show A') // soonest first
  })

  it('returns at most 5 results', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    for (let idx = 0; idx < 8; idx++) {
      await seedEvent(venue.id, {
        title: `Show ${idx}`,
        date: `2027-06-0${idx + 1}`,
      })
    }

    const res = await app.request('/v1/search/popular')
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.data).toHaveLength(5)
  })

  const popularImageryResponse = z.object({
    data: z.array(
      z.object({
        id: z.string(),
        artist: z.string(),
        imageUrl: z.string().nullable(),
        artistPhotoUrl: z.string().nullable(),
        watcherCount: z.number(),
      }),
    ),
  })

  // The palette drew a generated mark for every popular row because this
  // payload carried no imagery at all, while the same show wore a real face on
  // Browse. The watcher count is an aggregate, so the portrait has to survive
  // the GROUP BY without multiplying rows.
  it('carries the row imagery chain, and one row per event', async () => {
    const venue = await seedVenue({ slug: 'popular-imagery-venue' })
    await seedArtist({
      name: 'Khruangbin',
      photoUrl: 'https://i.scdn.co/image/headliner',
    })
    const withPhoto = await seedEvent(venue.id, {
      artist: 'Khruangbin',
      date: '2027-06-01',
      imageUrl: null,
    })
    const withArtwork = await seedEvent(venue.id, {
      artist: 'Nobody Here',
      date: '2027-06-02',
      imageUrl: 'https://cdn.test/flyer.jpg',
    })
    // Two watchers on the portrait row: a join that multiplied would show up
    // as a duplicated event here rather than as a wrong count.
    await seedUserEvent('user-1', withPhoto.id, { status: 'watching' })
    await seedUserEvent('user-2', withPhoto.id, { status: 'watching' })
    await seedUserEvent('user-3', withArtwork.id, { status: 'watching' })

    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
    // Parsed rather than cast: a cast would assert the imagery fields exist
    // without checking, which is the failure this test guards against.
    const body = popularImageryResponse.parse(await res.json())

    expect(body.data).toHaveLength(2)
    const portrait = body.data.find((row) => row.id === withPhoto.id)
    expect(portrait?.artistPhotoUrl).toBe('https://i.scdn.co/image/headliner')
    expect(portrait?.imageUrl).toBeNull()
    expect(portrait?.watcherCount).toBe(2)

    const artwork = body.data.find((row) => row.id === withArtwork.id)
    expect(artwork?.imageUrl).toBe('https://cdn.test/flyer.jpg')
    expect(artwork?.artistPhotoUrl).toBeNull()
  })

  it('excludes first_missing_at rows so the popular surface only shows live shows', async () => {
    const venue = await seedVenue({
      name: 'Popular Missing Venue',
      slug: 'popular-missing-venue',
    })
    await seedEvent(venue.id, {
      title: 'Active Popular',
      artist: 'Pop A',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-05',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale Popular',
      artist: 'Pop B',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-06',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string }[]
    }
    const titles = body.data.map((row) => row.title)
    expect(titles).toContain('Active Popular')
    expect(titles).not.toContain('Stale Popular')
  })
})

describe('GET /v1/search — anonymous reads (#794)', () => {
  // Replaces the REQUIRE_BETA_AUTH 401 assertion. The flag is gone, so the
  // contract is the inverse: search serves anonymous callers.
  it('serves /popular to an anonymous caller', async () => {
    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
  })
})

// #1115 PR-G — artists become first-class search results that route to their
// own page, alongside the event-derived rows the palette already renders.
describe('GET /v1/search/artists — integration (#1115 PR-G)', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('rejects a query shorter than two characters', async () => {
    const res = await app.request('/v1/search/artists?q=a')
    expect(res.status).toBe(400)
  })

  it('returns a matching artist with its slug and upcoming show count', async () => {
    const venue = await seedVenue({ slug: 'artist-search-venue' })
    await seedArtist({ name: 'King Gizzard', photoUrl: 'https://img/kg.jpg' })
    await seedEvent(venue.id, {
      artist: 'King Gizzard',
      date: '2027-09-01',
      showTime: '20:00:00',
    })

    const res = await app.request('/v1/search/artists?q=gizz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        name: string
        slug: string
        photoUrl: string | null
        upcomingShowCount: number
      }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      name: 'King Gizzard',
      slug: 'king-gizzard',
      photoUrl: 'https://img/kg.jpg',
      upcomingShowCount: 1,
    })
  })

  it('counts a future cancelled or postponed show as upcoming, matching the artist page', async () => {
    const venue = await seedVenue({ slug: 'status-search-venue' })
    await seedArtist({ name: 'Status Band' })
    await seedEvent(venue.id, {
      artist: 'Status Band',
      canonicalArtist: 'status band',
      date: '2027-09-03',
      status: 'cancelled',
    })
    await seedEvent(venue.id, {
      artist: 'Status Band',
      canonicalArtist: 'status band',
      date: '2027-09-04',
      status: 'postponed',
    })

    const res = await app.request('/v1/search/artists?q=status band')
    const body = (await res.json()) as {
      data: Array<{ slug: string; upcomingShowCount: number }>
    }
    expect(body.data[0]?.slug).toBe('status-band')
    expect(body.data[0]?.upcomingShowCount).toBe(2)
  })

  it('counts support-slot appearances toward an artist being returned', async () => {
    const venue = await seedVenue({ slug: 'support-search-venue' })
    await seedArtist({ name: 'Opening Act' })
    await seedEvent(venue.id, {
      artist: 'Some Headliner',
      supportingArtists: ['Opening Act'],
      canonicalSupporting: ['opening act'],
      date: '2027-09-02',
    })

    const res = await app.request('/v1/search/artists?q=opening')
    const body = (await res.json()) as {
      data: Array<{ slug: string; upcomingShowCount: number }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.slug).toBe('opening-act')
    expect(body.data[0]?.upcomingShowCount).toBe(1)
  })

  // #1203 — only headliners[0] reaches canonical_artist, so the second act on
  // a co-headline bill is invisible to search unless canonical_headliners is
  // in the condition. Kept in lock-step with routes/artists-public.ts.
  it('counts a co-headline slot toward an artist being returned', async () => {
    const venue = await seedVenue({ slug: 'coheadline-search-venue' })
    await seedArtist({ name: 'Great Dane' })
    await seedEvent(venue.id, {
      artist: 'Desert Dwellers',
      headliners: ['Desert Dwellers', 'Great Dane'],
      canonicalHeadliners: ['desert dwellers', 'great dane'],
      date: '2027-09-04',
    })

    const res = await app.request('/v1/search/artists?q=great dane')
    const body = (await res.json()) as {
      data: Array<{ slug: string; upcomingShowCount: number }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.slug).toBe('great-dane')
    expect(body.data[0]?.upcomingShowCount).toBe(1)
  })

  it('omits an artist whose only events are hidden from consumers', async () => {
    const venue = await seedVenue({ slug: 'hidden-search-venue' })
    await seedArtist({ name: 'Hidden Only' })
    await seedEvent(venue.id, {
      artist: 'Hidden Only',
      date: '2027-09-03',
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/search/artists?q=hidden')
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })

  it('omits an artist with no events at all', async () => {
    await seedArtist({ name: 'Orphan Artist' })

    const res = await app.request('/v1/search/artists?q=orphan')
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })

  it('ranks an exact canonical match above a partial one', async () => {
    const venue = await seedVenue({ slug: 'rank-search-venue' })
    await seedArtist({ name: 'Wolf' })
    await seedArtist({ name: 'Wolf Alice' })
    await seedEvent(venue.id, { artist: 'Wolf', date: '2027-09-04' })
    await seedEvent(venue.id, { artist: 'Wolf Alice', date: '2027-09-05' })

    const res = await app.request('/v1/search/artists?q=wolf')
    const body = (await res.json()) as { data: Array<{ slug: string }> }
    expect(body.data.map((row) => row.slug)).toEqual(['wolf', 'wolf-alice'])
  })

  it('caps the artist section so it cannot crowd out event rows', async () => {
    const venue = await seedVenue({ slug: 'cap-search-venue' })
    for (let i = 0; i < 6; i += 1) {
      await seedArtist({ name: `Capped Artist ${i}` })
      await seedEvent(venue.id, {
        artist: `Capped Artist ${i}`,
        date: `2027-09-1${i}`,
      })
    }

    const res = await app.request('/v1/search/artists?q=capped')
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data.length).toBeLessThanOrEqual(3)
  })

  it('serves an anonymous caller', async () => {
    const res = await app.request('/v1/search/artists?q=anything')
    expect(res.status).toBe(200)
  })
})
