import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId: string): void {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

// Parsed rather than cast: a cast would keep passing if the route stopped
// emitting isWatching altogether, which is the exact regression these tests
// exist to catch.
const relatedBodySchema = z.object({
  success: z.literal(true),
  data: z.object({
    data: z.array(
      z.object({
        id: z.string(),
        artist: z.string(),
        isWatching: z.boolean(),
        // Required on the shared Event interface. Nullable, not optional — an
        // absent key fails this parse, which is how the slim select stays
        // honest about the contract it claims to satisfy.
        eventUrl: z.string().nullable(),
        pipelineExhaustedAt: z.string().nullable(),
      }),
    ),
  }),
})

const readRelated = async (res: Response) =>
  relatedBodySchema.parse(await res.json())

describe('GET /v1/events/:id/related — watch state', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('marks only the caller’s own watched siblings', async () => {
    setAuth('user_related_watcher')
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden-related' })
    const source = await seedEvent(venue.id, {
      artist: 'Source',
      date: '2027-06-15',
    })
    const watched = await seedEvent(venue.id, {
      artist: 'Watched Sibling',
      date: '2027-06-16',
    })
    const unwatched = await seedEvent(venue.id, {
      artist: 'Unwatched Sibling',
      date: '2027-06-17',
    })
    await seedUserEvent('user_related_watcher', watched.id, {
      status: 'watching',
    })
    // Someone else's watch on the other sibling must not leak through.
    await seedUserEvent('user_related_stranger', unwatched.id, {
      status: 'watching',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    expect(res.status).toBe(200)
    // The authed answer must never reach a shared cache.
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(res.headers.get('Vary')).toContain('Authorization')
    const body = await readRelated(res)
    const byId = new Map(body.data.data.map((row) => [row.id, row.isWatching]))
    expect(byId.get(watched.id)).toBe(true)
    expect(byId.get(unwatched.id)).toBe(false)
  })

  it('reports every row as not watching for an anonymous caller', async () => {
    const venue = await seedVenue({
      name: 'Bluebird',
      slug: 'bluebird-related',
    })
    const source = await seedEvent(venue.id, {
      artist: 'Source',
      date: '2027-06-15',
    })
    const sibling = await seedEvent(venue.id, {
      artist: 'Sibling',
      date: '2027-06-16',
    })
    await seedUserEvent('user_related_anon_other', sibling.id, {
      status: 'watching',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    // Anonymous stays cacheable — Vary alone keeps a shared cache from serving
    // this body back to a signed-in caller.
    expect(res.headers.get('Cache-Control')).toBeNull()
    expect(res.headers.get('Vary')).toContain('Authorization')
    const body = await readRelated(res)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.isWatching).toBe(false)
  })

  it('does not treat an attendance-only row as watching', async () => {
    setAuth('user_related_attendee')
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic-related' })
    const source = await seedEvent(venue.id, {
      artist: 'Source',
      date: '2027-06-15',
    })
    const sibling = await seedEvent(venue.id, {
      artist: 'Sibling',
      date: '2027-06-16',
    })
    // Status NULL with attendingAt set is the attendance-only row shape (#70).
    await seedUserEvent('user_related_attendee', sibling.id, {
      status: null,
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    const body = await readRelated(res)
    expect(body.data.data[0]?.isWatching).toBe(false)
  })
})
