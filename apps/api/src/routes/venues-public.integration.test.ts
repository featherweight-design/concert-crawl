import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables, seedEvent, seedVenue } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/venues — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty list when no venues exist', async () => {
    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('returns only active venues', async () => {
    await seedVenue({
      name: 'Active Venue',
      slug: 'active-venue',
      active: true,
    })
    await seedVenue({
      name: 'Inactive Venue',
      slug: 'inactive-venue',
      active: false,
    })

    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { slug: string }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.slug).toBe('active-venue')
  })

  it('returns multiple active venues', async () => {
    await seedVenue({ name: 'Venue Alpha', slug: 'venue-alpha', active: true })
    await seedVenue({ name: 'Venue Beta', slug: 'venue-beta', active: true })

    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.data).toHaveLength(2)
  })

  it('upcomingCount excludes first_missing_at rows so dupes do not inflate the venue chips', async () => {
    const venue = await seedVenue({
      name: 'Count Missing Venue',
      slug: 'count-missing-venue',
    })
    await seedEvent(venue.id, {
      title: 'Active',
      artist: 'A',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-05',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale',
      artist: 'B',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-06',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { slug: string; upcomingCount: number }[]
    }
    expect(body.success).toBe(true)
    const row = body.data.find(
      (venueRow) => venueRow.slug === 'count-missing-venue',
    )
    expect(row?.upcomingCount).toBe(1)
  })
})

describe('GET /v1/venues/:slug — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns venue detail by slug', async () => {
    await seedVenue({ name: 'Red Rocks', slug: 'red-rocks' })

    const res = await app.request('/v1/venues/red-rocks')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { venue: { name: string; slug: string }; upcomingEvents: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(body.data.venue.name).toBe('Red Rocks')
    expect(body.data.venue.slug).toBe('red-rocks')
  })

  it('upcomingEvents and upcomingCount exclude first_missing_at rows so detail surface matches list surface', async () => {
    const venue = await seedVenue({
      name: 'Detail Missing Venue',
      slug: 'detail-missing-venue-vp',
    })
    await seedEvent(venue.id, {
      title: 'Active',
      artist: 'A',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-05',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale',
      artist: 'B',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-06',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request('/v1/venues/detail-missing-venue-vp')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        venue: { upcomingCount: number }
        upcomingEvents: { title: string }[]
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.venue.upcomingCount).toBe(1)
    expect(body.data.upcomingEvents).toHaveLength(1)
    expect(body.data.upcomingEvents[0]?.title).toBe('Active')
  })

  it('returns 404 for unknown slug', async () => {
    const res = await app.request('/v1/venues/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Venue not found')
  })

  it('returns 404 for an inactive venue rather than serving its page', async () => {
    const venue = await seedVenue({
      name: 'Closed Venue',
      slug: 'closed-venue',
      active: false,
    })
    await seedEvent(venue.id, { artist: 'Someone', date: '2027-06-05' })

    const res = await app.request('/v1/venues/closed-venue')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Venue not found')
  })

  it('serializes supportingArtists and tourName on venue-profile events', async () => {
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })
    await seedEvent(venue.id, {
      artist: 'Wednesday',
      date: '2027-06-05',
      supportingArtists: ['Hotline TNT'],
      tourName: 'Rat Saw God Tour',
    })
    const res = await app.request('/v1/venues/ogden')
    const body = (await res.json()) as {
      success: boolean
      data: {
        venue: { slug: string }
        upcomingEvents: {
          supportingArtists: string[] | null
          tourName: string | null
        }[]
      }
    }
    expect(body.data.upcomingEvents[0]?.supportingArtists).toEqual([
      'Hotline TNT',
    ])
    expect(body.data.upcomingEvents[0]?.tourName).toBe('Rat Saw God Tour')
  })
})

describe('GET /v1/venues — anonymous reads (#794)', () => {
  // Replaces the REQUIRE_BETA_AUTH 401 assertion. The flag is gone, so the
  // contract is the inverse: the venue list serves anonymous callers.
  it('serves the list to an anonymous caller', async () => {
    const res = await app.request('/v1/venues')
    expect(res.status).toBe(200)
  })
})
