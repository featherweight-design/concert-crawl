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
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { eq } from 'drizzle-orm'
import { userEvents } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
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

const rowsFor = async (userId: string) =>
  testDb.select().from(userEvents).where(eq(userEvents.userId, userId))

describe('DELETE /v1/events/:id/watch', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000001/watch',
      { method: 'DELETE' },
    )
    expect(res.status).toBe(401)
  })

  it('deletes a watching-only row', async () => {
    setAuth('user_ev_watch_only')
    const venue = await seedVenue({ name: 'Larimer', slug: 'larimer' })
    const event = await seedEvent(venue.id, { date: '2099-10-01' })
    await seedUserEvent('user_ev_watch_only', event.id, { status: 'watching' })

    const res = await app.request(`/v1/events/${event.id}/watch`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    expect(await rowsFor('user_ev_watch_only')).toHaveLength(0)
  })

  it('keeps an attended row and only clears the watch', async () => {
    setAuth('user_ev_attending')
    const venue = await seedVenue({ name: 'Hi-Dive', slug: 'hi-dive' })
    const event = await seedEvent(venue.id, { date: '2099-10-02' })
    await seedUserEvent('user_ev_attending', event.id, {
      status: 'watching',
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/events/${event.id}/watch`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)

    const rows = await rowsFor('user_ev_attending')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBeNull()
    expect(rows[0]?.attendingAt).not.toBeNull()
  })

  it('leaves an attending-only row untouched', async () => {
    setAuth('user_ev_attend_only')
    const venue = await seedVenue({ name: 'Skylark', slug: 'skylark' })
    const event = await seedEvent(venue.id, { date: '2099-10-03' })
    await seedUserEvent('user_ev_attend_only', event.id, {
      status: null,
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/events/${event.id}/watch`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)

    const rows = await rowsFor('user_ev_attend_only')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.attendingAt).not.toBeNull()
  })
})

describe('POST /v1/events/:id/watch', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('preserves attendingAt when watching an attending-only row', async () => {
    setAuth('user_ev_post')
    const venue = await seedVenue({ name: 'Meow Wolf', slug: 'meow-wolf' })
    const event = await seedEvent(venue.id, { date: '2099-10-04' })
    await seedUserEvent('user_ev_post', event.id, {
      status: null,
      attendingAt: new Date('2026-07-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/events/${event.id}/watch`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)

    const rows = await rowsFor('user_ev_post')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('watching')
    expect(rows[0]?.attendingAt).not.toBeNull()
  })
})
