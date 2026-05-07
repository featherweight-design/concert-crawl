import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables, seedVenue } from '../test/helpers/seed.js'

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

  it('returns 404 for unknown slug', async () => {
    const res = await app.request('/v1/venues/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Venue not found')
  })
})
