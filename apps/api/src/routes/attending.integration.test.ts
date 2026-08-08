// Integration tests for PUT/DELETE /v1/attending/:eventId (#70).
// The entitlement gate derives the plan from real billing rows, so these tests
// seed subscriptions rather than mocking canUseFeature — that's the only way to
// prove the gate is actually mounted.
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

import { and, eq, sql } from 'drizzle-orm'
import {
  crewMembers,
  crews,
  notifications,
  subscriptions,
  userEvents,
} from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'
import { ENTITLEMENT_REQUIRED_CODE } from '../middleware/entitlement.js'

const app = createApp()
const USER_ID = 'user_attending_test'

const setAuth = (userId = USER_ID, role = 'user'): void => {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

const seedSupporter = async (userId = USER_ID): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'supporter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}

const rowFor = async (userId: string, eventId: string) => {
  const [row] = await testDb
    .select()
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventId, eventId)))
  return row
}

describe('PUT/DELETE /v1/attending/:eventId', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/attending/some-id', { method: 'PUT' })
    expect(res.status).toBe(401)
  })

  it('returns 403 with the typed code for a plan the matrix denies', async () => {
    setAuth()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string; feature: string }
    expect(body.code).toBe(ENTITLEMENT_REQUIRED_CODE)
    expect(body.feature).toBe('concert-history')
  })

  it('returns 400 for a non-UUID event id', async () => {
    setAuth()
    await seedSupporter()
    const res = await app.request('/v1/attending/not-a-uuid', { method: 'PUT' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an event hidden from consumers', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-01-01',
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(404)
  })

  it('creates an attending-only row (status stays null)', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { going: boolean; attendingAt: string | null }
    }
    expect(body.data.going).toBe(true)
    expect(body.data.attendingAt).not.toBeNull()

    const row = await rowFor(USER_ID, event.id)
    expect(row?.status).toBeNull()
    expect(row?.attendingAt).not.toBeNull()
  })

  it('preserves an existing watch when marking attendance', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })
    await seedUserEvent(USER_ID, event.id, { status: 'watching' })

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'PUT',
    })
    expect(res.status).toBe(200)

    const row = await rowFor(USER_ID, event.id)
    expect(row?.status).toBe('watching')
    expect(row?.attendingAt).not.toBeNull()
  })

  it('is idempotent — a second PUT keeps the original timestamp', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })

    const first = (await (
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
    ).json()) as { data: { attendingAt: string } }
    const second = (await (
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
    ).json()) as { data: { attendingAt: string } }

    expect(second.data.attendingAt).toBe(first.data.attendingAt)
  })

  // Gate 6 (side-effect provenance): the crew bell row is created by attendance
  // happening, so "fires once" has to be proved at the trigger, not the helper.
  describe('crew fan-out fires exactly once per attendance', () => {
    const MATE = 'user_attending_crewmate'

    const seedSharedCrew = async (): Promise<void> => {
      const [crew] = await testDb
        .insert(crews)
        .values({ name: 'The Regulars', keeperId: USER_ID })
        .returning()
      if (!crew) throw new Error('seedSharedCrew: insert returned no rows')
      await testDb.insert(crewMembers).values([
        { crewId: crew.id, userId: USER_ID },
        { crewId: crew.id, userId: MATE },
      ])
    }

    const mateRowCount = async (): Promise<number> => {
      const rows = await testDb
        .select()
        .from(notifications)
        .where(eq(notifications.userId, MATE))
      return rows.length
    }

    it('does not re-notify when the same user PUTs twice', async () => {
      setAuth()
      await seedSupporter()
      await seedSharedCrew()
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: '2026-01-01' })

      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })

      expect(await mateRowCount()).toBe(1)
    })

    it('does not double-notify when two PUTs race', async () => {
      setAuth()
      await seedSupporter()
      await seedSharedCrew()
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: '2026-01-01' })

      // Both requests read "not going yet", so only the atomic transition
      // claim can keep this to one bell row.
      await Promise.all([
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
      ])

      expect(await mateRowCount()).toBe(1)
    })

    it('reports the persisted timestamp to the request that lost the race', async () => {
      setAuth()
      await seedSupporter()
      await seedSharedCrew()
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: '2026-01-01' })

      const [first, second] = await Promise.all([
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
        app.request(`/v1/attending/${event.id}`, { method: 'PUT' }),
      ])
      const firstBody: { data: { attendingAt: string } } = await first.json()
      const secondBody: { data: { attendingAt: string } } = await second.json()

      // The loser generated its own timestamp; it must report the stored one.
      const stored = (await rowFor(USER_ID, event.id))?.attendingAt
      expect(firstBody.data.attendingAt).toBe(stored?.toISOString())
      expect(secondBody.data.attendingAt).toBe(stored?.toISOString())
    })

    it('notifies again after the user un-goes and goes back', async () => {
      setAuth()
      await seedSupporter()
      await seedSharedCrew()
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: '2026-01-01' })

      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })
      await app.request(`/v1/attending/${event.id}`, { method: 'DELETE' })
      await app.request(`/v1/attending/${event.id}`, { method: 'PUT' })

      // A genuine second decision is genuinely news, unlike a re-tap.
      expect(await mateRowCount()).toBe(2)
    })
  })

  it('DELETE removes an attending-only row entirely', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })
    await seedUserEvent(USER_ID, event.id, {
      status: null,
      attendingAt: new Date('2026-06-01T00:00:00.000Z'),
    })

    const res = await app.request(`/v1/attending/${event.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { going: boolean; attendingAt: string | null }
    }
    expect(body.data.going).toBe(false)
    expect(body.data.attendingAt).toBeNull()

    expect(await rowFor(USER_ID, event.id)).toBeUndefined()
  })

  it('DELETE nulls only attending_at on a watching+attending row', async () => {
    setAuth()
    await seedSupporter()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-01-01' })
    await seedUserEvent(USER_ID, event.id, {
      status: 'watching',
      attendingAt: new Date('2026-06-01T00:00:00.000Z'),
    })

    await app.request(`/v1/attending/${event.id}`, { method: 'DELETE' })

    const row = await rowFor(USER_ID, event.id)
    expect(row?.status).toBe('watching')
    expect(row?.attendingAt).toBeNull()
  })
})
