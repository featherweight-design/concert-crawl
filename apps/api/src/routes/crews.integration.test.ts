// Integration tests for /v1/crews (#1226 PR-2).
//
// Two guarantees carry the most weight here and both are asserted explicitly:
//   1. The entitlement shape. Create 403s on free; list, read, leave, and mute
//      all 200 on free, which is what lets a lapsed creator keep every crew
//      they already made (plan D6).
//   2. The tense rule. Upcoming needs >= 1 member going; a past night needs
//      >= 2 (locked decision 2), including at the exact boundaries.
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

import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { crewMembers, crews, subscriptions } from '@concert-crawl/db'
import type { CrewDetail, CrewShow, CrewSummary } from '@concert-crawl/types'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../test/helpers/seed.js'
import { ENTITLEMENT_REQUIRED_CODE } from '../middleware/entitlement.js'
import {
  CREW_HANDOFF_REQUIRED_CODE,
  CREW_LAST_MEMBER_CODE,
  CREW_MEMBER_CAP,
} from '../lib/crews.js'

const app = createApp()
const KEEPER = 'user_crew_keeper'
const MATE = 'user_crew_mate'
const STRANGER = 'user_crew_stranger'

const setAuth = (userId = KEEPER): void => {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

const seedSupporter = async (userId = KEEPER): Promise<void> => {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'supporter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  })
}

const seedCrew = async (
  members: string[],
  overrides: Partial<typeof crews.$inferInsert> = {},
): Promise<string> => {
  const keeperId = overrides.keeperId ?? members[0] ?? KEEPER
  const [crew] = await testDb
    .insert(crews)
    .values({ name: 'The Regulars', ...overrides, keeperId })
    .returning()
  if (!crew) throw new Error('seedCrew: insert returned no rows')
  if (members.length > 0) {
    await testDb
      .insert(crewMembers)
      .values(members.map((userId) => ({ crewId: crew.id, userId })))
  }
  return crew.id
}

// Dates relative to today so the Mountain-Time tense predicate is exercised
// rather than frozen against a literal that ages out of the future.
const dayOffset = (days: number): string => {
  const when = new Date()
  when.setUTCDate(when.getUTCDate() + days)
  return when.toISOString().slice(0, 10)
}

type ListBody = { success: boolean; data: { crews: CrewSummary[] } }
type DetailBody = { success: boolean; data: CrewDetail }
type ShowsBody = { success: boolean; data: { shows: CrewShow[] } }

describe('/v1/crews', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
    await testDb.execute(
      sql`TRUNCATE subscriptions, gifted_comps, user_billing`,
    )
  })

  describe('auth and entitlement shape', () => {
    it('returns 401 on every route when unauthenticated', async () => {
      const crewId = randomUUID()
      const routes: [string, string][] = [
        ['GET', '/v1/crews'],
        ['POST', '/v1/crews'],
        ['GET', `/v1/crews/${crewId}`],
        ['GET', `/v1/crews/${crewId}/shows`],
        ['PATCH', `/v1/crews/${crewId}`],
        ['POST', `/v1/crews/${crewId}/patch/reroll`],
        ['DELETE', `/v1/crews/${crewId}`],
        ['DELETE', `/v1/crews/${crewId}/members/${MATE}`],
        ['POST', `/v1/crews/${crewId}/leave`],
        ['POST', `/v1/crews/${crewId}/handoff`],
        ['PUT', `/v1/crews/${crewId}/mute`],
        ['DELETE', `/v1/crews/${crewId}/mute`],
      ]
      for (const [method, path] of routes) {
        const res = await app.request(path, { method })
        expect(res.status, `${method} ${path}`).toBe(401)
      }
    })

    it('403s create on the free plan with the typed code', async () => {
      setAuth()
      const res = await app.request('/v1/crews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'The Regulars' }),
      })
      expect(res.status).toBe(403)
      const body = (await res.json()) as { code: string; feature: string }
      expect(body.code).toBe(ENTITLEMENT_REQUIRED_CODE)
      expect(body.feature).toBe('crews')
    })

    // The single most important test in the PR: a lapsed creator keeps every
    // crew they already made and only loses the ability to start another.
    it('leaves list, read, mute, and leave open on the free plan', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth(MATE)

      expect((await app.request('/v1/crews')).status).toBe(200)
      expect((await app.request(`/v1/crews/${crewId}`)).status).toBe(200)
      expect((await app.request(`/v1/crews/${crewId}/shows`)).status).toBe(200)
      expect(
        (await app.request(`/v1/crews/${crewId}/mute`, { method: 'PUT' }))
          .status,
      ).toBe(200)
      expect(
        (await app.request(`/v1/crews/${crewId}/mute`, { method: 'DELETE' }))
          .status,
      ).toBe(200)
      expect(
        (await app.request(`/v1/crews/${crewId}/leave`, { method: 'POST' }))
          .status,
      ).toBe(200)
    })

    it('403s a non-member read', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth(STRANGER)
      expect((await app.request(`/v1/crews/${crewId}`)).status).toBe(403)
      expect((await app.request(`/v1/crews/${crewId}/shows`)).status).toBe(403)
    })

    it('403s a member attempting a keeper mutation', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth(MATE)
      const res = await app.request(`/v1/crews/${crewId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed' }),
      })
      expect(res.status).toBe(403)
      expect(
        (
          await app.request(`/v1/crews/${crewId}/patch/reroll`, {
            method: 'POST',
          })
        ).status,
      ).toBe(403)
      expect(
        (await app.request(`/v1/crews/${crewId}`, { method: 'DELETE' })).status,
      ).toBe(403)
    })

    it('404s a keeper mutation from a non-member, not 403', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth(STRANGER)
      const res = await app.request(`/v1/crews/${crewId}`, { method: 'DELETE' })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /v1/crews', () => {
    it('returns an empty list for a user in no crews', async () => {
      setAuth()
      const res = await app.request('/v1/crews')
      expect(res.status).toBe(200)
      const body = (await res.json()) as ListBody
      expect(body.data.crews).toEqual([])
    })

    it('summarises a crew of one', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth()
      const body = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(body.data.crews).toHaveLength(1)
      const [crew] = body.data.crews
      expect(crew?.id).toBe(crewId)
      expect(crew?.memberCount).toBe(1)
      expect(crew?.members).toHaveLength(1)
      expect(crew?.isKeeper).toBe(true)
      expect(crew?.muted).toBe(false)
      expect(crew?.upcomingCount).toBe(0)
    })

    it('counts every member at the cap but clusters only five', async () => {
      const members = Array.from(
        { length: CREW_MEMBER_CAP },
        (_, index) => `user_capped_${index}`,
      )
      await seedCrew(members)
      setAuth(members[0])
      const body = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(body.data.crews[0]?.memberCount).toBe(CREW_MEMBER_CAP)
      expect(body.data.crews[0]?.members).toHaveLength(5)
    })

    it('keeps a member with no handle nullable rather than inventing one', async () => {
      await seedUserProfile(KEEPER, { handle: null, avatarColor: null })
      await seedCrew([KEEPER])
      setAuth()
      const body = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(body.data.crews[0]?.members[0]?.handle).toBeNull()
      expect(body.data.crews[0]?.members[0]?.avatarColor).toBeNull()
    })

    it('reflects a mute', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth()
      await app.request(`/v1/crews/${crewId}/mute`, { method: 'PUT' })
      const body = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(body.data.crews[0]?.muted).toBe(true)
    })

    it('counts an upcoming show once even when two members are going', async () => {
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: dayOffset(7) })
      await seedUserEvent(KEEPER, event.id, {
        status: null,
        attendingAt: new Date(),
      })
      await seedUserEvent(MATE, event.id, {
        status: null,
        attendingAt: new Date(),
      })
      await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(body.data.crews[0]?.upcomingCount).toBe(1)
    })
  })

  describe('the tense rule', () => {
    const seedShow = async (
      date: string,
      attendees: string[],
      slug: string,
    ): Promise<string> => {
      const venue = await seedVenue({ name: `Venue ${slug}`, slug })
      const event = await seedEvent(venue.id, { date, artist: `Act ${slug}` })
      for (const userId of attendees) {
        await seedUserEvent(userId, event.id, {
          status: null,
          attendingAt: new Date(),
        })
      }
      return event.id
    }

    it('puts an upcoming show with exactly one attendee in upcoming and not nights', async () => {
      const eventId = await seedShow(dayOffset(5), [KEEPER], 'solo-future')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(body.data.upcoming.map((show) => show.eventId)).toEqual([eventId])
      expect(body.data.upcoming[0]?.goingCount).toBe(1)
      expect(body.data.nights).toEqual([])
    })

    it('drops a past show with exactly one attendee from both lists', async () => {
      await seedShow(dayOffset(-5), [KEEPER], 'solo-past')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(body.data.upcoming).toEqual([])
      expect(body.data.nights).toEqual([])
    })

    it('keeps a past show with exactly two attendees in nights', async () => {
      const eventId = await seedShow(dayOffset(-5), [KEEPER, MATE], 'duo-past')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(body.data.nights.map((show) => show.eventId)).toEqual([eventId])
      expect(body.data.nights[0]?.goingCount).toBe(2)
      expect(body.data.nights[0]?.going).toHaveLength(2)
    })

    it('orders the going list deterministically across requests', async () => {
      // Both attendees tie on every date key, so without a tie-break the
      // avatars on a night could swap places between two identical requests.
      await seedShow(dayOffset(-5), [KEEPER, MATE], 'duo-stable')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const first = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      const second = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(first.data.nights[0]?.going.map((who) => who.userId)).toEqual(
        [KEEPER, MATE].sort(),
      )
      expect(second.data.nights[0]?.going).toEqual(first.data.nights[0]?.going)
    })

    it('ignores attendance by someone outside the crew', async () => {
      await seedShow(dayOffset(4), [STRANGER], 'outsider')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(body.data.upcoming).toEqual([])
    })

    it('serves the same upcoming predicate from the lens feed', async () => {
      const eventId = await seedShow(dayOffset(5), [KEEPER], 'lens')
      await seedShow(dayOffset(-5), [KEEPER, MATE], 'lens-past')
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const body = (await (
        await app.request(`/v1/crews/${crewId}/shows`)
      ).json()) as ShowsBody
      expect(body.data.shows.map((show) => show.eventId)).toEqual([eventId])
    })
  })

  describe('POST /v1/crews', () => {
    it('creates the crew and the creator membership together', async () => {
      setAuth()
      await seedSupporter()
      const res = await app.request('/v1/crews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'The Regulars' }),
      })
      expect(res.status).toBe(201)
      const body = (await res.json()) as { data: { crew: CrewSummary } }
      expect(body.data.crew.name).toBe('The Regulars')
      expect(body.data.crew.patchSalt).toBe(0)
      expect(body.data.crew.memberCount).toBe(1)
      expect(body.data.crew.isKeeper).toBe(true)

      const list = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(list.data.crews).toHaveLength(1)
    })

    it('returns the creator preview the list would, not an anonymous one', async () => {
      setAuth()
      await seedSupporter()
      await seedUserProfile(KEEPER, {
        handle: 'regular',
        avatarColor: 'signal',
      })
      const res = await app.request('/v1/crews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'The Regulars' }),
      })
      const body = (await res.json()) as { data: { crew: CrewSummary } }
      const list = (await (await app.request('/v1/crews')).json()) as ListBody
      // A hard-coded null here renders the creator as an anonymous avatar on
      // their own brand-new crew until the list refetches and contradicts it.
      expect(body.data.crew.members).toEqual(list.data.crews[0]?.members)
    })

    it('orders a roster deterministically when joinedAt ties', async () => {
      // A single insert gives every row the same joinedAt, so joinedAt alone
      // leaves the order up to the planner and the cluster flickers.
      const crewId = await seedCrew([KEEPER, MATE, STRANGER])
      setAuth()
      const first = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      const second = (await (
        await app.request(`/v1/crews/${crewId}`)
      ).json()) as DetailBody
      expect(first.data.members.map((member) => member.userId)).toEqual(
        [KEEPER, MATE, STRANGER].sort(),
      )
      expect(second.data.members).toEqual(first.data.members)
    })

    it('honours a client-minted id and 409s a repeat of it', async () => {
      setAuth()
      await seedSupporter()
      const id = randomUUID()
      const send = async (): Promise<Response> =>
        app.request('/v1/crews', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, name: 'The Regulars' }),
        })

      const first = await send()
      expect(first.status).toBe(201)
      const body = (await first.json()) as { data: { crew: CrewSummary } }
      expect(body.data.crew.id).toBe(id)

      const second = await send()
      expect(second.status).toBe(409)
    })

    it('400s an empty or over-long name', async () => {
      setAuth()
      await seedSupporter()
      for (const name of ['', 'x'.repeat(41)]) {
        const res = await app.request('/v1/crews', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        expect(res.status).toBe(400)
      }
    })
  })

  describe('keeper mutations', () => {
    it('renames without moving the patch', async () => {
      const crewId = await seedCrew([KEEPER], { patchSalt: 3 })
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Still Us' }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: { crew: { name: string; patchSalt: number } }
      }
      expect(body.data.crew.name).toBe('Still Us')
      // Renaming rerolling the artwork is exactly the bug the design forbids.
      expect(body.data.crew.patchSalt).toBe(3)
    })

    it('increments the patch salt by exactly one on reroll', async () => {
      const crewId = await seedCrew([KEEPER], { patchSalt: 3 })
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}/patch/reroll`, {
        method: 'POST',
      })
      const body = (await res.json()) as {
        data: { crew: { patchSalt: number } }
      }
      expect(body.data.crew.patchSalt).toBe(4)
    })

    it('removes a member and refuses to remove the keeper', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const removed = await app.request(`/v1/crews/${crewId}/members/${MATE}`, {
        method: 'DELETE',
      })
      expect(removed.status).toBe(200)

      const self = await app.request(`/v1/crews/${crewId}/members/${KEEPER}`, {
        method: 'DELETE',
      })
      expect(self.status).toBe(409)
    })

    it('deletes the crew and leaves attendance alone', async () => {
      const venue = await seedVenue()
      const event = await seedEvent(venue.id, { date: dayOffset(-5) })
      await seedUserEvent(KEEPER, event.id, {
        status: null,
        attendingAt: new Date(),
      })
      const crewId = await seedCrew([KEEPER])
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}`, { method: 'DELETE' })
      expect(res.status).toBe(200)

      const list = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(list.data.crews).toEqual([])
      const attendance = await testDb.execute(
        sql`SELECT count(*)::int AS total FROM user_events WHERE attending_at IS NOT NULL`,
      )
      expect(attendance[0]?.['total']).toBe(1)
    })
  })

  describe('leave and handoff', () => {
    it('lets a non-keeper leave', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth(MATE)
      const res = await app.request(`/v1/crews/${crewId}/leave`, {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      const list = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(list.data.crews).toEqual([])
    })

    it('409s a keeper leaving while another member remains', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}/leave`, {
        method: 'POST',
      })
      expect(res.status).toBe(409)
      const body = (await res.json()) as { code: string }
      expect(body.code).toBe(CREW_HANDOFF_REQUIRED_CODE)
    })

    it('409s a lone keeper with the last-member code', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}/leave`, {
        method: 'POST',
      })
      expect(res.status).toBe(409)
      const body = (await res.json()) as { code: string }
      expect(body.code).toBe(CREW_LAST_MEMBER_CODE)
    })

    it('hands the crew on, after which the old keeper may leave', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const handoff = await app.request(`/v1/crews/${crewId}/handoff`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newKeeperId: MATE }),
      })
      expect(handoff.status).toBe(200)
      const body = (await handoff.json()) as {
        data: { crew: { keeperId: string } }
      }
      expect(body.data.crew.keeperId).toBe(MATE)

      const left = await app.request(`/v1/crews/${crewId}/leave`, {
        method: 'POST',
      })
      expect(left.status).toBe(200)
    })

    it('400s an over-long member id rather than passing it to the DB', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const res = await app.request(
        `/v1/crews/${crewId}/members/${'x'.repeat(300)}`,
        { method: 'DELETE' },
      )
      expect(res.status).toBe(400)
    })

    it('400s a handoff to someone outside the crew', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth()
      const res = await app.request(`/v1/crews/${crewId}/handoff`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newKeeperId: STRANGER }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('mute', () => {
    it('is idempotent in both directions', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth()
      for (let i = 0; i < 2; i += 1) {
        const res = await app.request(`/v1/crews/${crewId}/mute`, {
          method: 'PUT',
        })
        expect(res.status).toBe(200)
      }
      const muted = (await (await app.request('/v1/crews')).json()) as ListBody
      expect(muted.data.crews[0]?.muted).toBe(true)

      for (let i = 0; i < 2; i += 1) {
        const res = await app.request(`/v1/crews/${crewId}/mute`, {
          method: 'DELETE',
        })
        expect(res.status).toBe(200)
      }
      const unmuted = (await (
        await app.request('/v1/crews')
      ).json()) as ListBody
      expect(unmuted.data.crews[0]?.muted).toBe(false)
    })

    it('403s a non-member', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth(STRANGER)
      const res = await app.request(`/v1/crews/${crewId}/mute`, {
        method: 'PUT',
      })
      expect(res.status).toBe(403)
    })
  })
})
