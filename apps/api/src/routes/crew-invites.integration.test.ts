// Integration tests for crew invites and the join surface (#1226 PR-3).
//
// Three guarantees carry the most weight and are asserted explicitly:
//   1. Privacy. A resolved invite is structurally incapable of naming what the
//      crew is going to, and the leak test proves the serialized body says so
//      (locked decision 4).
//   2. Dead links. Expired, revoked, and unknown all 404 with `reason` and no
//      crew identity at all (locked decision 11). At-cap is NOT a dead link.
//   3. The cap. Concurrent joins at 11 members yield 12 and one 409, never 13.
import { describe, it, expect, beforeEach, vi } from 'vitest'

interface TestAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  // `x-test-user` takes precedence over the shared slot so two concurrent
  // requests can carry different identities. Mutating one module-level slot
  // between two un-awaited `app.request` calls is a race in the test itself:
  // the handler reads the slot after both writes have landed.
  getAuth: (ctx: { req: { header: (name: string) => string | undefined } }) => {
    const header = ctx.req.header('x-test-user')
    if (!header) return authState.current
    return { userId: header, sessionClaims: { metadata: { role: 'user' } } }
  },
}))

import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { crewInvites, crewMembers, crews } from '@concert-crawl/db'
import type { CrewInvite, PublicCrewInvite } from '@concert-crawl/types'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../test/helpers/seed.js'
import { CREW_FULL_CODE, CREW_MEMBER_CAP } from '../lib/crews.js'
import { generateCrewInviteToken } from '../lib/crew-invite-token.js'

const app = createApp()
const KEEPER = 'user_invite_keeper'
const MATE = 'user_invite_mate'
const JOINER = 'user_invite_joiner'
const STRANGER = 'user_invite_stranger'

const setAuth = (userId = KEEPER): void => {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

const seedCrew = async (members: string[]): Promise<string> => {
  const [crew] = await testDb
    .insert(crews)
    .values({ name: 'The Regulars', keeperId: members[0] ?? KEEPER })
    .returning()
  if (!crew) throw new Error('seedCrew: insert returned no rows')
  if (members.length > 0) {
    await testDb
      .insert(crewMembers)
      .values(members.map((userId) => ({ crewId: crew.id, userId })))
  }
  return crew.id
}

const seedInvite = async (
  crewId: string,
  overrides: Partial<typeof crewInvites.$inferInsert> = {},
): Promise<typeof crewInvites.$inferSelect> => {
  const [row] = await testDb
    .insert(crewInvites)
    .values({
      crewId,
      token: generateCrewInviteToken(),
      createdBy: KEEPER,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedInvite: insert returned no rows')
  return row
}

// Anchored on Mountain Time rather than UTC: the crew show queries split tense
// on `NOW() AT TIME ZONE 'America/Denver'`, and for the seven UTC hours where
// Denver is still on the previous calendar day a UTC anchor puts offset 0 one
// day the wrong side of the boundary.
const dayOffset = (days: number): string => {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Denver',
  })
  const when = new Date(`${today}T00:00:00Z`)
  when.setUTCDate(when.getUTCDate() + days)
  return when.toISOString().slice(0, 10)
}

type InviteBody = { success: boolean; data: { invite: CrewInvite } }
type CurrentBody = { success: boolean; data: { invite: CrewInvite | null } }
type PublicBody = { success: boolean; data: { invite: PublicCrewInvite } }
type DeadBody = { success: boolean; reason: string }
type JoinBody = {
  success: boolean
  data: { crewId: string; joined: boolean; alreadyMember: boolean }
}

describe('crew invites', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  describe('minting (POST /v1/crews/:crewId/invites)', () => {
    it('returns 401 unauthenticated', async () => {
      const res = await app.request(`/v1/crews/${randomUUID()}/invites`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('mints a 12-character token for any member, not just the keeper', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth(MATE)

      const res = await app.request(`/v1/crews/${crewId}/invites`, {
        method: 'POST',
      })
      expect(res.status).toBe(201)

      const body: InviteBody = await res.json()
      expect(body.data.invite.token).toMatch(/^[A-Za-z0-9_-]{12}$/)
      expect(body.data.invite.createdBy).toBe(MATE)
      expect(body.data.invite.crewId).toBe(crewId)
      // Seven days, give or take the round trip.
      const ttl = Date.parse(body.data.invite.expiresAt) - Date.now()
      expect(ttl).toBeGreaterThan(6.9 * 86400000)
      expect(ttl).toBeLessThanOrEqual(7 * 86400000)
    })

    it('403s a non-member and reveals nothing about the crew', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth(STRANGER)

      const res = await app.request(`/v1/crews/${crewId}/invites`, {
        method: 'POST',
      })
      expect(res.status).toBe(403)
      expect(await res.text()).not.toContain('The Regulars')
    })

    it('leaves at most one live invite: minting revokes the previous one', async () => {
      const crewId = await seedCrew([KEEPER])
      const first = await seedInvite(crewId)
      setAuth(KEEPER)

      const res = await app.request(`/v1/crews/${crewId}/invites`, {
        method: 'POST',
      })
      expect(res.status).toBe(201)

      const rows = await testDb
        .select()
        .from(crewInvites)
        .where(eq(crewInvites.crewId, crewId))
      expect(rows).toHaveLength(2)
      const previous = rows.find((row) => row.id === first.id)
      expect(previous?.revokedAt).not.toBeNull()
      expect(previous?.revokedBy).toBe(KEEPER)
      expect(rows.filter((row) => row.revokedAt === null)).toHaveLength(1)
    })

    it('still leaves exactly one live invite when two members mint at once', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      setAuth(KEEPER)

      // The two requests share the mocked auth state, which is fine: the race
      // under test is the revoke-then-insert one, not an identity one.
      const results = await Promise.all([
        app.request(`/v1/crews/${crewId}/invites`, { method: 'POST' }),
        app.request(`/v1/crews/${crewId}/invites`, { method: 'POST' }),
      ])
      expect(results.map((res) => res.status)).toEqual([201, 201])

      const live = await testDb
        .select()
        .from(crewInvites)
        .where(
          sql`${crewInvites.crewId} = ${crewId} AND ${crewInvites.revokedAt} IS NULL`,
        )
      expect(live).toHaveLength(1)
    })
  })

  describe('GET /v1/crews/:crewId/invites/current', () => {
    it('returns null when nothing is live', async () => {
      const crewId = await seedCrew([KEEPER])
      await seedInvite(crewId, { revokedAt: new Date(), revokedBy: KEEPER })
      await seedInvite(crewId, { expiresAt: new Date(Date.now() - 1000) })
      setAuth(KEEPER)

      const res = await app.request(`/v1/crews/${crewId}/invites/current`)
      expect(res.status).toBe(200)
      const body: CurrentBody = await res.json()
      expect(body.data.invite).toBeNull()
    })

    it('returns the live invite to a member and 403s a stranger', async () => {
      const crewId = await seedCrew([KEEPER])
      const live = await seedInvite(crewId)

      setAuth(KEEPER)
      const mine = await app.request(`/v1/crews/${crewId}/invites/current`)
      const body: CurrentBody = await mine.json()
      expect(body.data.invite?.id).toBe(live.id)

      setAuth(STRANGER)
      const theirs = await app.request(`/v1/crews/${crewId}/invites/current`)
      expect(theirs.status).toBe(403)
    })
  })

  describe('POST /v1/crews/:crewId/invites/:inviteId/revoke', () => {
    it('lets any member retire the link, and a second tap is idempotent', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      const invite = await seedInvite(crewId)
      setAuth(MATE)

      const first = await app.request(
        `/v1/crews/${crewId}/invites/${invite.id}/revoke`,
        { method: 'POST' },
      )
      expect(first.status).toBe(200)

      const [row] = await testDb
        .select()
        .from(crewInvites)
        .where(eq(crewInvites.id, invite.id))
      expect(row?.revokedAt).not.toBeNull()
      expect(row?.revokedBy).toBe(MATE)

      // Asking for a state that already holds is a success, not a 404 — and it
      // must not move the timestamp of the revoke that actually happened.
      const second = await app.request(
        `/v1/crews/${crewId}/invites/${invite.id}/revoke`,
        { method: 'POST' },
      )
      expect(second.status).toBe(200)

      const [after] = await testDb
        .select()
        .from(crewInvites)
        .where(eq(crewInvites.id, invite.id))
      expect(after?.revokedAt).toEqual(row?.revokedAt)
    })

    it('404s an invite id that does not exist', async () => {
      const crewId = await seedCrew([KEEPER])
      setAuth(KEEPER)

      const res = await app.request(
        `/v1/crews/${crewId}/invites/${randomUUID()}/revoke`,
        { method: 'POST' },
      )
      expect(res.status).toBe(404)
    })

    it('cannot retire an invite belonging to another crew', async () => {
      const mine = await seedCrew([KEEPER])
      const theirs = await seedCrew([STRANGER])
      const invite = await seedInvite(theirs)
      setAuth(KEEPER)

      const res = await app.request(
        `/v1/crews/${mine}/invites/${invite.id}/revoke`,
        { method: 'POST' },
      )
      expect(res.status).toBe(404)

      const [row] = await testDb
        .select()
        .from(crewInvites)
        .where(eq(crewInvites.id, invite.id))
      expect(row?.revokedAt).toBeNull()
    })
  })

  describe('GET /v1/crew-invites/:token — resolution', () => {
    it('401s unauthenticated: the join surface is auth-gated for beta', async () => {
      const crewId = await seedCrew([KEEPER])
      const invite = await seedInvite(crewId)
      const res = await app.request(`/v1/crew-invites/${invite.token}`)
      expect(res.status).toBe(401)
    })

    it('resolves a live token for someone who is not a member', async () => {
      const crewId = await seedCrew([KEEPER, MATE])
      await seedUserProfile(KEEPER, { handle: 'thefrontrow' })
      const invite = await seedInvite(crewId)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}`)
      expect(res.status).toBe(200)
      const body: PublicBody = await res.json()
      expect(body.data.invite).toEqual({
        crewId,
        name: 'The Regulars',
        patchSalt: 0,
        memberCount: 2,
        invitedByHandle: 'thefrontrow',
        isFull: false,
      })
    })

    it('reports a null handle rather than inventing a name', async () => {
      const crewId = await seedCrew([KEEPER])
      const invite = await seedInvite(crewId)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}`)
      const body: PublicBody = await res.json()
      expect(body.data.invite.invitedByHandle).toBeNull()
    })

    it('resolves at capacity with isFull — a full crew is not a dead link', async () => {
      const members = Array.from(
        { length: CREW_MEMBER_CAP },
        (_, index) => `user_full_${index}`,
      )
      const crewId = await seedCrew(members)
      const invite = await seedInvite(crewId)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}`)
      expect(res.status).toBe(200)
      const body: PublicBody = await res.json()
      expect(body.data.invite.isFull).toBe(true)
      expect(body.data.invite.memberCount).toBe(CREW_MEMBER_CAP)
      // Identity stays visible — that is the whole point of not 404ing here.
      expect(body.data.invite.name).toBe('The Regulars')
    })

    it.each([
      ['revoked', { revokedAt: new Date(), revokedBy: KEEPER }],
      ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ])(
      'answers 404 with reason %s and no crew fields',
      async (reason, overrides) => {
        const crewId = await seedCrew([KEEPER])
        const invite = await seedInvite(crewId, overrides)
        setAuth(JOINER)

        const res = await app.request(`/v1/crew-invites/${invite.token}`)
        expect(res.status).toBe(404)
        const body: DeadBody = await res.json()
        expect(body.reason).toBe(reason)

        const raw = JSON.stringify(body)
        expect(raw).not.toContain('The Regulars')
        expect(raw).not.toContain(crewId)
      },
    )

    it('answers 404 unknown for a token nobody minted', async () => {
      setAuth(JOINER)
      const res = await app.request(
        `/v1/crew-invites/${generateCrewInviteToken()}`,
      )
      expect(res.status).toBe(404)
      const body: DeadBody = await res.json()
      expect(body.reason).toBe('unknown')
    })

    it('answers 404 unknown for a malformed token without touching the DB', async () => {
      setAuth(JOINER)
      const res = await app.request('/v1/crew-invites/not-a-real-token-at-all')
      expect(res.status).toBe(404)
      const body: DeadBody = await res.json()
      expect(body.reason).toBe('unknown')
    })

    it('rate limits enumeration on the caller id', async () => {
      const grinder = `user_grinder_${randomUUID()}`
      setAuth(grinder)

      let limited: Response | null = null
      for (let i = 0; i < 40; i++) {
        const res = await app.request(
          `/v1/crew-invites/${generateCrewInviteToken()}`,
        )
        if (res.status === 429) {
          limited = res
          break
        }
      }
      expect(limited).not.toBeNull()
      // A client that cannot see the window backs off by guessing.
      expect(Number(limited?.headers.get('Retry-After'))).toBeGreaterThan(0)
    })

    it('spends one budget across resolve and join, not two', async () => {
      // Join answers 404/409/200 distinctly, so it enumerates as well as
      // resolve does. Separate budgets would hand an attacker twice the
      // attempts for the same 72 bits.
      const grinder = `user_grinder_${randomUUID()}`
      setAuth(grinder)

      for (let i = 0; i < 40; i++) {
        const res = await app.request(
          `/v1/crew-invites/${generateCrewInviteToken()}`,
        )
        if (res.status === 429) break
      }

      const join = await app.request(
        `/v1/crew-invites/${generateCrewInviteToken()}/join`,
        { method: 'POST' },
      )
      expect(join.status).toBe(429)
      expect(Number(join.headers.get('Retry-After'))).toBeGreaterThan(0)
    })
  })

  describe('the leak test (locked decision 4)', () => {
    it('never names what the crew is going to', async () => {
      const venue = await seedVenue({
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
      })
      const event = await seedEvent(venue.id, {
        title: 'Ratboys',
        artist: 'Ratboys',
        date: dayOffset(5),
      })
      const crewId = await seedCrew([KEEPER, MATE])
      await seedUserEvent(KEEPER, event.id, {
        status: 'going',
        attendingAt: new Date(),
      })
      await seedUserEvent(MATE, event.id, {
        status: 'going',
        attendingAt: new Date(),
      })
      const invite = await seedInvite(crewId)

      // The joiner's actual state: signed in, and not in this crew.
      setAuth(JOINER)
      const res = await app.request(`/v1/crew-invites/${invite.token}`)
      expect(res.status).toBe(200)

      const raw = await res.text()
      expect(raw).not.toContain(event.id)
      expect(raw).not.toContain('Ratboys')
      expect(raw).not.toContain('Bluebird Theater')
      expect(raw).not.toContain('bluebird-theater')
      expect(raw).not.toContain(dayOffset(5))
    })
  })

  describe('POST /v1/crew-invites/:token/join', () => {
    it('401s unauthenticated', async () => {
      const crewId = await seedCrew([KEEPER])
      const invite = await seedInvite(crewId)
      const res = await app.request(`/v1/crew-invites/${invite.token}/join`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('joins on a live token without any entitlement', async () => {
      const crewId = await seedCrew([KEEPER])
      const invite = await seedInvite(crewId)
      // No subscription row at all — paying is the price of starting a crew,
      // never of being in one.
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}/join`, {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      const body: JoinBody = await res.json()
      expect(body.data).toEqual({ crewId, joined: true, alreadyMember: false })

      const rows = await testDb
        .select()
        .from(crewMembers)
        .where(eq(crewMembers.crewId, crewId))
      expect(rows).toHaveLength(2)
    })

    it('treats a second tap as a 200 no-op, not an error', async () => {
      const crewId = await seedCrew([KEEPER, JOINER])
      const invite = await seedInvite(crewId)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}/join`, {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      const body: JoinBody = await res.json()
      // No row was created, so `joined` is false — the two fields disagree on
      // purpose, and that disagreement is how a client tells the taps apart.
      expect(body.data).toEqual({ crewId, joined: false, alreadyMember: true })

      const rows = await testDb
        .select()
        .from(crewMembers)
        .where(eq(crewMembers.crewId, crewId))
      expect(rows).toHaveLength(2)
    })

    it.each([
      ['revoked', { revokedAt: new Date(), revokedBy: KEEPER }],
      ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ])('refuses a %s link with no crew fields', async (reason, overrides) => {
      const crewId = await seedCrew([KEEPER])
      const invite = await seedInvite(crewId, overrides)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}/join`, {
        method: 'POST',
      })
      expect(res.status).toBe(404)
      const body: DeadBody = await res.json()
      expect(body.reason).toBe(reason)
      expect(JSON.stringify(body)).not.toContain('The Regulars')

      const rows = await testDb
        .select()
        .from(crewMembers)
        .where(eq(crewMembers.crewId, crewId))
      expect(rows).toHaveLength(1)
    })

    it('409s at the cap', async () => {
      const members = Array.from(
        { length: CREW_MEMBER_CAP },
        (_, index) => `user_cap_${index}`,
      )
      const crewId = await seedCrew(members)
      const invite = await seedInvite(crewId)
      setAuth(JOINER)

      const res = await app.request(`/v1/crew-invites/${invite.token}/join`, {
        method: 'POST',
      })
      expect(res.status).toBe(409)
      const body: { code: string } = await res.json()
      expect(body.code).toBe(CREW_FULL_CODE)
    })

    it('never exceeds the cap when two people tap at once on the last seat', async () => {
      const members = Array.from(
        { length: CREW_MEMBER_CAP - 1 },
        (_, index) => `user_race_${index}`,
      )
      const crewId = await seedCrew(members)
      const invite = await seedInvite(crewId)

      // Distinct callers, so this is the cap race and not the duplicate-join
      // path. Identity rides a header rather than the shared slot — see the
      // getAuth mock.
      const attempt = (userId: string): Promise<Response> =>
        app.request(`/v1/crew-invites/${invite.token}/join`, {
          method: 'POST',
          headers: { 'x-test-user': userId },
        })
      const [first, second] = await Promise.all([
        attempt('user_race_a'),
        attempt('user_race_b'),
      ])

      const statuses = [first.status, second.status].sort()
      expect(statuses).toEqual([200, 409])

      const rows = await testDb
        .select()
        .from(crewMembers)
        .where(eq(crewMembers.crewId, crewId))
      expect(rows).toHaveLength(CREW_MEMBER_CAP)
    })
  })
})
