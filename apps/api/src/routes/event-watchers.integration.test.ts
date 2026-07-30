import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'

interface MockAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { userProfiles } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
} from '../test/helpers/seed.js'
import { ROSTER_CAP } from '../lib/event-watchers.js'

const app = createApp()

const VIEWER = 'user_viewer'
const VIEWER_HANDLE = 'viewer_handle'

interface WatchersBody {
  success: boolean
  error?: string
  data?: {
    total: number
    named: Array<{ handle: string; avatarColor: unknown }>
  }
}

function setAuth(userId = VIEWER): void {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

async function fetchWatchers(eventId: string): Promise<{
  status: number
  body: WatchersBody
}> {
  const res = await app.request(`/v1/events/${eventId}/watchers`)
  const body: WatchersBody = await res.json()
  return { status: res.status, body }
}

/** Seed an event with the viewer watching it, and return the event id. */
async function seedWatchedEvent(): Promise<string> {
  const venue = await seedVenue()
  const event = await seedEvent(venue.id)
  await seedUserProfile(VIEWER, { handle: VIEWER_HANDLE })
  await seedUserEvent(VIEWER, event.id)
  return event.id
}

/** Add a watcher, optionally with a handle. */
async function addWatcher(
  eventId: string,
  userId: string,
  handle: string | null,
  overrides: {
    createdAt?: Date
    status?: 'watching' | 'going' | 'interested'
  } = {},
): Promise<void> {
  await seedUserProfile(userId, { handle })
  await seedUserEvent(userId, eventId, overrides)
}

describe('GET /v1/events/:id/watchers', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('excludes the viewer from their own roster', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_a', 'marisol')
    await addWatcher(eventId, 'user_b', 'dev_ftw')
    setAuth()

    const { status, body } = await fetchWatchers(eventId)
    expect(status).toBe(200)
    expect(body.data?.total).toBe(2)
    expect(
      body.data?.named.every((watcher) => watcher.handle !== VIEWER_HANDLE),
    ).toBe(true)
  })

  it('counts handle-less watchers in total but never names them', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_a', 'marisol')
    await addWatcher(eventId, 'user_b', null)
    await addWatcher(eventId, 'user_c', null)
    await addWatcher(eventId, 'user_d', null)
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data?.total).toBe(4)
    expect(body.data?.named).toHaveLength(1)
    expect(body.data?.named[0]?.handle).toBe('marisol')
  })

  it('exposes exactly handle and avatarColor — no identity fields', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_a', 'marisol')
    setAuth()

    const { body } = await fetchWatchers(eventId)
    const named = body.data?.named[0]
    expect(named).toBeDefined()
    expect(Object.keys(named ?? {}).sort()).toEqual(['avatarColor', 'handle'])
  })

  it('counts a watcher with no profile row at all without naming them', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_a', 'marisol')
    // No seedUserProfile — proves the inner join, not a left join.
    await seedUserEvent('user_profileless', eventId)
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data?.total).toBe(2)
    expect(body.data?.named).toHaveLength(1)
  })

  it('drops a watcher from named when they clear their handle', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_a', 'marisol')
    setAuth()

    const before = await fetchWatchers(eventId)
    expect(before.body.data?.named).toHaveLength(1)

    await testDb
      .update(userProfiles)
      .set({ handle: null })
      .where(eq(userProfiles.userId, 'user_a'))

    const after = await fetchWatchers(eventId)
    expect(after.body.data?.named).toHaveLength(0)
    expect(after.body.data?.total).toBe(1)
  })

  it('returns 401 with no data for anonymous callers', async () => {
    const eventId = await seedWatchedEvent()

    const { status, body } = await fetchWatchers(eventId)
    expect(status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.data).toBeUndefined()
  })

  it('excludes going and interested statuses', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_going', 'goer', { status: 'going' })
    await addWatcher(eventId, 'user_interested', 'maybe', {
      status: 'interested',
    })
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data?.total).toBe(0)
    expect(body.data?.named).toHaveLength(0)
  })

  it('returns zero watchers when the viewer is the only one', async () => {
    const eventId = await seedWatchedEvent()
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data).toEqual({ total: 0, named: [] })
  })

  it('orders named watchers most-recent-first', async () => {
    const eventId = await seedWatchedEvent()
    await addWatcher(eventId, 'user_old', 'oldest', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })
    await addWatcher(eventId, 'user_mid', 'middle', {
      createdAt: new Date('2026-02-01T00:00:00Z'),
    })
    await addWatcher(eventId, 'user_new', 'newest', {
      createdAt: new Date('2026-03-01T00:00:00Z'),
    })
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data?.named.map((watcher) => watcher.handle)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })

  it('truncates named at ROSTER_CAP while total reports the true count', async () => {
    const eventId = await seedWatchedEvent()
    const watcherCount = ROSTER_CAP + 5
    for (let i = 0; i < watcherCount; i += 1) {
      await addWatcher(eventId, `user_${i}`, `handle_${i}`)
    }
    setAuth()

    const { body } = await fetchWatchers(eventId)
    expect(body.data?.total).toBe(watcherCount)
    expect(body.data?.named).toHaveLength(ROSTER_CAP)
  })

  it('returns 404 for an unknown event id', async () => {
    setAuth()
    const { status } = await fetchWatchers(
      '00000000-0000-4000-8000-000000000000',
    )
    expect(status).toBe(404)
  })

  it('returns 404 for a non-uuid event id', async () => {
    setAuth()
    const { status } = await fetchWatchers('not-a-uuid')
    expect(status).toBe(404)
  })

  it('returns 404 for an event hidden from consumers', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { hiddenFromConsumer: true })
    await addWatcher(event.id, 'user_a', 'marisol')
    setAuth()

    const { status } = await fetchWatchers(event.id)
    expect(status).toBe(404)
  })

  it('returns 404 for an event the crawler stopped seeing', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { firstMissingAt: new Date() })
    await addWatcher(event.id, 'user_a', 'marisol')
    setAuth()

    const { status } = await fetchWatchers(event.id)
    expect(status).toBe(404)
  })

  it('sets a private, non-shared cache header', async () => {
    const eventId = await seedWatchedEvent()
    setAuth()

    const res = await app.request(`/v1/events/${eventId}/watchers`)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
