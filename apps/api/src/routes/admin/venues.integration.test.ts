import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedCrawlRun,
  seedEvent,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import { events } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'

const app = createApp()

function setAuth(role: 'admin' | 'sub_admin' | 'user'): void {
  authState.current = {
    userId: 'test-user-1',
    sessionClaims: { metadata: { role } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when authenticated as user role', async () => {
    setAuth('user')
    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 200 with venue list as admin', async () => {
    setAuth('admin')
    await seedVenue({ name: 'Ogden Theatre', slug: 'ogden-theatre' })

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { name: string }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.name).toBe('Ogden Theatre')
  })

  it('admin returns all venues including inactive', async () => {
    setAuth('admin')
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

    const res = await app.request('/v1/admin/venues')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { name: string; active: boolean }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
  })
})

describe('GET /v1/admin/venues/:id — integration (crawl health)', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 404 for unknown venue', async () => {
    setAuth('admin')
    const res = await app.request(
      '/v1/admin/venues/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
  })

  it('includes crawlHealth in response', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Fox Theatre', slug: 'fox-theatre' })
    await seedCrawlRun(venue.id, { status: 'success', durationMs: 1500 })
    await seedCrawlRun(venue.id, { status: 'failed', durationMs: 800 })
    await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/venues/${venue.id}`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: {
        id: string
        crawlHealth: {
          sevenDayPercent: number
          sparkline: { date: string; success: boolean }[]
          lastCrawledAt: string | null
          avgDurationMs: number | null
          eventsTracked: number
          consecutiveFails: number
        }
      }
    }

    expect(body.success).toBe(true)
    expect(body.data.id).toBe(venue.id)
    expect(body.data.crawlHealth).toBeDefined()
    expect(body.data.crawlHealth.sparkline).toBeInstanceOf(Array)
    expect(body.data.crawlHealth.eventsTracked).toBe(1)
    expect(body.data.crawlHealth.consecutiveFails).toBe(0)
    expect(typeof body.data.crawlHealth.sevenDayPercent).toBe('number')
  })

  it('returns zero eventsTracked when no events', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Empty Venue', slug: 'empty-venue' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { crawlHealth: { eventsTracked: number } }
    }
    expect(body.data.crawlHealth.eventsTracked).toBe(0)
  })
})

describe('POST /v1/admin/venues — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Venue',
        slug: 'test-venue',
        websiteUrl: 'https://testvenue.example.com',
      }),
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 on missing required fields', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete' }),
    })
    expect(res.status).toBe(400)
  })

  it('creates a venue and returns 201', async () => {
    setAuth('admin')
    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        websiteUrl: 'https://bluebirdtheater.com',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { id: string; name: string; slug: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Bluebird Theater')
    expect(body.data.slug).toBe('bluebird-theater')
    expect(body.data.id).toBeDefined()
  })

  it('returns 409 when slug is already in use', async () => {
    setAuth('admin')
    await seedVenue({ name: 'Existing Venue', slug: 'taken-slug' })

    const res = await app.request('/v1/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Venue',
        slug: 'taken-slug',
        websiteUrl: 'https://newvenue.example.com',
      }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      success: boolean
      error: string
      field: string
    }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Slug already in use')
    expect(body.field).toBe('slug')
  })
})

describe('PATCH /v1/admin/venues/:id — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 409 when slug is taken by another venue', async () => {
    setAuth('admin')
    const venue1 = await seedVenue({ name: 'Venue One', slug: 'venue-one' })
    await seedVenue({ name: 'Venue Two', slug: 'venue-two' })

    const res = await app.request(`/v1/admin/venues/${venue1.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'venue-two' }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      success: boolean
      error: string
      field: string
    }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Slug already in use')
    expect(body.field).toBe('slug')
  })

  it('allows updating to the same slug on the same venue', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'ogden', name: 'Ogden Theatre' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { name: string; slug: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Ogden Theatre')
    expect(body.data.slug).toBe('ogden')
  })
})

describe('DELETE /v1/admin/venues/:id — integration (hard delete)', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 404 for unknown venue', async () => {
    setAuth('admin')
    const res = await app.request(
      '/v1/admin/venues/00000000-0000-0000-0000-000000000000',
      { method: 'DELETE' },
    )
    expect(res.status).toBe(404)
  })

  it('hard deletes venue and returns eventsDetached count', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'Venue To Delete',
      slug: 'delete-me',
    })
    await seedEvent(venue.id)
    await seedEvent(venue.id, { artist: 'Second Artist', date: '2026-07-01' })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { eventsDetached: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.eventsDetached).toBe(2)
  })

  it('nulls venue_id on events but keeps events in DB', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Venue X', slug: 'venue-x' })
    const event = await seedEvent(venue.id)

    await app.request(`/v1/admin/venues/${venue.id}`, { method: 'DELETE' })

    const [detachedEvent] = await testDb
      .select({ venueId: events.venueId })
      .from(events)
      .where(eq(events.id, event.id))

    expect(detachedEvent).toBeDefined()
    expect(detachedEvent?.venueId).toBeNull()
  })

  it('venue is gone from DB after delete', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Gone Venue', slug: 'gone-venue' })

    await app.request(`/v1/admin/venues/${venue.id}`, { method: 'DELETE' })

    const getRes = await app.request(`/v1/admin/venues/${venue.id}`)
    expect(getRes.status).toBe(404)
  })

  it('returns 0 eventsDetached when venue had no events', async () => {
    setAuth('admin')
    const venue = await seedVenue({
      name: 'No Events Venue',
      slug: 'no-events-venue',
    })

    const res = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      success: boolean
      data: { eventsDetached: number }
    }
    expect(body.data.eventsDetached).toBe(0)
  })
})

describe('GET /v1/admin/venues/robots-audit — integration', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/admin/venues/robots-audit')
    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as user role', async () => {
    setAuth('user')
    const res = await app.request('/v1/admin/venues/robots-audit')
    expect(res.status).toBe(403)
  })

  it('returns only active venues with stored robots status', async () => {
    setAuth('admin')
    const checkedAt = new Date('2026-07-01T12:00:00.000Z')
    await seedVenue({
      name: 'Allowed Venue',
      slug: 'allowed-venue',
      active: true,
      robotsTxtAllowed: true,
      robotsTxtCheckedAt: checkedAt,
    })
    await seedVenue({
      name: 'Blocked Venue',
      slug: 'blocked-venue',
      active: true,
      robotsTxtAllowed: false,
      robotsTxtCheckedAt: checkedAt,
    })
    await seedVenue({
      name: 'Unchecked Venue',
      slug: 'unchecked-venue',
      active: true,
      robotsTxtAllowed: null,
      robotsTxtCheckedAt: null,
    })
    await seedVenue({
      name: 'Inactive Venue',
      slug: 'inactive-venue',
      active: false,
      robotsTxtAllowed: true,
      robotsTxtCheckedAt: checkedAt,
    })

    const res = await app.request('/v1/admin/venues/robots-audit')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        name: string
        slug: string
        websiteUrl: string
        robotsTxtAllowed: boolean | null
        robotsTxtCheckedAt: string | null
      }[]
    }
    expect(body.success).toBe(true)
    // Inactive venue is excluded; the three active venues are returned by name.
    expect(body.data).toHaveLength(3)
    expect(body.data.map((row) => row.name)).toEqual([
      'Allowed Venue',
      'Blocked Venue',
      'Unchecked Venue',
    ])

    const allowed = body.data.find((row) => row.slug === 'allowed-venue')
    expect(allowed?.robotsTxtAllowed).toBe(true)
    expect(allowed?.robotsTxtCheckedAt).toBe(checkedAt.toISOString())

    const unchecked = body.data.find((row) => row.slug === 'unchecked-venue')
    expect(unchecked?.robotsTxtAllowed).toBeNull()
    expect(unchecked?.robotsTxtCheckedAt).toBeNull()
  })
})
