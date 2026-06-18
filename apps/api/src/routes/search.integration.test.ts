import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import {
  clearTables,
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
      date: '2027-06-01',
    })
    const eventB = await seedEvent(venue.id, {
      title: 'Show B',
      artist: 'Artist B',
      date: '2027-06-02',
    })
    const eventC = await seedEvent(venue.id, {
      title: 'Show C',
      artist: 'Artist C',
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

  it('excludes first_missing_at rows so the popular surface only shows live shows', async () => {
    const venue = await seedVenue({
      name: 'Popular Missing Venue',
      slug: 'popular-missing-venue',
    })
    await seedEvent(venue.id, {
      title: 'Active Popular',
      artist: 'Pop A',
      date: '2027-06-05',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale Popular',
      artist: 'Pop B',
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

describe('GET /v1/search/popular — beta auth gate', () => {
  it('returns 401 without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { searchRouter: freshRouter } = await import('./search.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/search', freshRouter)
      const res = await testApp.request('/v1/search/popular')
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })
})
