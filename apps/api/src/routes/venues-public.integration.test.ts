import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedEvent,
  seedVenue,
  seedVenueGuideChips,
} from '../test/helpers/seed.js'

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

  it('returns 404, not 400, for a param that cannot be a slug', async () => {
    const res = await app.request('/v1/venues/Not%20A%20Slug')
    expect(res.status).toBe(404)
    const body: { success: boolean; error: string } = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Venue not found')
  })

  it('returns 404 for an inactive venue rather than serving its page', async () => {
    const venue = await seedVenue({
      name: 'Closed Venue',
      slug: 'closed-venue',
      active: false,
    })
    // Seeded deliberately: the venue has real content, so a regression that
    // drops the active filter would serve a populated page rather than an
    // empty one — this asserts we 404 even when there is something to show.
    await seedEvent(venue.id, { artist: 'Someone', date: '2027-06-05' })

    const res = await app.request('/v1/venues/closed-venue')
    expect(res.status).toBe(404)
    const body: { success: boolean; error: string } = await res.json()
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

describe('GET /v1/venues/:slug — first-timer guide (#764)', () => {
  beforeEach(async () => {
    await clearTables()
  })

  interface GuideBody {
    success: boolean
    data: {
      venue: {
        slug: string
        guide: {
          chips: {
            chipType: string
            body: string
            isPlaceholder: boolean
          }[]
          insiderTip: string | null
          publishedAt: string | null
        } | null
      }
      viewerHasAttended: boolean | null
    }
  }

  it('serves the published guide with chips ordered by GUIDE_CHIP_ORDER', async () => {
    const venue = await seedVenue({
      name: 'Guide Venue',
      slug: 'guide-venue',
      insiderTip: 'Runs loud — grab earplugs at the bar.',
      guidePublishedAt: new Date('2026-08-01T12:00:00Z'),
    })
    // Inserted deliberately out of display order so the assertion proves the
    // route sorts rather than echoing insertion order.
    await seedVenueGuideChips(venue.id, [
      { chipType: 'transit', body: 'A-line to 38th & Blake.' },
      { chipType: 'parking', body: 'Paid lot on Blake, $15 cash.' },
      { chipType: 'accessibility', body: 'Step-free entrance on the north.' },
    ])

    const res = await app.request('/v1/venues/guide-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as GuideBody
    const guide = body.data.venue.guide
    expect(guide).not.toBeNull()
    expect(guide?.chips.map((chip) => chip.chipType)).toEqual([
      'accessibility',
      'parking',
      'transit',
    ])
    expect(guide?.insiderTip).toBe('Runs loud — grab earplugs at the bar.')
    expect(guide?.publishedAt).toBe('2026-08-01T12:00:00.000Z')
  })

  it('carries isPlaceholder through so the honest accessibility row can render', async () => {
    const venue = await seedVenue({
      name: 'Placeholder Venue',
      slug: 'placeholder-venue',
      guidePublishedAt: new Date('2026-08-01T12:00:00Z'),
    })
    await seedVenueGuideChips(venue.id, [
      { chipType: 'accessibility', body: '', isPlaceholder: true },
    ])

    const res = await app.request('/v1/venues/placeholder-venue')
    const body = (await res.json()) as GuideBody
    expect(body.data.venue.guide?.chips).toEqual([
      { chipType: 'accessibility', body: '', isPlaceholder: true },
    ])
  })

  it('never leaks a draft guide — unpublished venue serves guide null even with chip rows', async () => {
    const venue = await seedVenue({
      name: 'Draft Venue',
      slug: 'draft-venue',
      insiderTip: 'Draft tip nobody should read yet.',
      guidePublishedAt: null,
    })
    await seedVenueGuideChips(venue.id, [
      { chipType: 'accessibility', body: 'Draft accessibility copy.' },
    ])

    const res = await app.request('/v1/venues/draft-venue')
    const body = (await res.json()) as GuideBody
    expect(body.data.venue.guide).toBeNull()
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('Draft tip nobody should read')
    expect(serialized).not.toContain('Draft accessibility copy')
  })

  it('serves guide null for a published venue with no chip rows', async () => {
    await seedVenue({
      name: 'Empty Guide Venue',
      slug: 'empty-guide-venue',
      guidePublishedAt: new Date('2026-08-01T12:00:00Z'),
    })

    const res = await app.request('/v1/venues/empty-guide-venue')
    const body = (await res.json()) as GuideBody
    expect(body.data.venue.guide).toBeNull()
  })

  it('reports viewerHasAttended as null — we do not know, and false would be a claim', async () => {
    await seedVenue({ name: 'Detection Venue', slug: 'detection-venue' })

    const res = await app.request('/v1/venues/detection-venue')
    const body = (await res.json()) as GuideBody
    expect(body.data.viewerHasAttended).toBeNull()
  })

  it('serves the identical guide payload to an unauthenticated caller (#794)', async () => {
    const venue = await seedVenue({
      name: 'Anon Venue',
      slug: 'anon-venue',
      insiderTip: 'Sound is best dead center.',
      guidePublishedAt: new Date('2026-08-01T12:00:00Z'),
    })
    await seedVenueGuideChips(venue.id, [
      { chipType: 'accessibility', body: 'Step-free entrance on 13th.' },
      { chipType: 'coat_check', body: 'Coat check is $3, cash only.' },
    ])

    const anonRes = await app.request('/v1/venues/anon-venue')
    const authRes = await app.request('/v1/venues/anon-venue', {
      headers: { Authorization: 'Bearer test-token' },
    })
    const anonBody = (await anonRes.json()) as GuideBody
    const authBody = (await authRes.json()) as GuideBody

    expect(anonBody.data.venue.guide).not.toBeNull()
    expect(anonBody.data.venue.guide).toEqual(authBody.data.venue.guide)
  })

  it('leaves the venue index untouched — no guide on the list response', async () => {
    const venue = await seedVenue({
      name: 'Index Venue',
      slug: 'index-venue',
      insiderTip: 'Tip that belongs to the detail page only.',
      guidePublishedAt: new Date('2026-08-01T12:00:00Z'),
    })
    await seedVenueGuideChips(venue.id, [
      { chipType: 'accessibility', body: 'Step-free entrance.' },
    ])

    const res = await app.request('/v1/venues')
    const body = (await res.json()) as { data: Record<string, unknown>[] }
    const row = body.data.find((entry) => entry.slug === 'index-venue')
    expect(row).toBeDefined()
    expect(row).not.toHaveProperty('guide')
    expect(row).not.toHaveProperty('insiderTip')
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
