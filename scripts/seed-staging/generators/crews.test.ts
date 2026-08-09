import { describe, it, expect, vi } from 'vitest'
import { createRng } from '../seeded-rng.js'
import { CREW_MEMBER_CAP } from '../../../packages/types/src/crew.js'
import { crewInviteTokenSchema } from '../../../apps/api/src/lib/crew-invite-token.js'
import { SEEDED_CREW_IDS } from '../fixture-users.js'
import { generateCrews, SEEDED_INVITE_TOKENS } from './crews.js'

const SEED = 202607_12

const ownerUserId = 'user_owner'
const crowdUserIds = Array.from(
  { length: 40 },
  (_, idx) => `user_seedcrowd_${String(idx).padStart(4, '0')}`,
)

const eventIds = Array.from(
  { length: 50 },
  (_, idx) =>
    `evt-00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
)
const pastEventIds = eventIds.slice(0, 25)

/**
 * Insert order is part of the contract here — every table goes through the same
 * spy, so the tests address them by index.
 */
const CREWS = 0
const MEMBERS = 1
const INVITES = 2
const MUTES = 3
const ATTENDANCE = 4

function buildStagingMock() {
  const valuesSpy = vi.fn().mockResolvedValue([])
  const staging = { insert: vi.fn().mockReturnValue({ values: valuesSpy }) }
  return { staging, valuesSpy }
}

const run = async (
  overrides: Partial<Parameters<typeof generateCrews>[0]> = {},
) => {
  const { staging, valuesSpy } = buildStagingMock()
  const result = await generateCrews({
    staging: staging as never,
    crowdUserIds,
    ownerUserId,
    eventIds,
    pastEventIds,
    excludeEventIds: [],
    rng: createRng(SEED),
    ...overrides,
  })
  const rowsAt = <T>(idx: number): T[] =>
    (valuesSpy.mock.calls[idx]?.[0] ?? []) as T[]
  return { result, valuesSpy, rowsAt }
}

type MemberRow = { crewId: string; userId: string }
type CrewRow = { id: string; keeperId: string; name: string }
type AttendanceRow = {
  userId: string
  eventId: string
  status: 'watching' | null
  attendingAt: Date
}

describe('generateCrews', () => {
  it('seeds one crew per shape, on fixed ids', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<CrewRow>(CREWS)
    expect(rows.map((row) => row.id)).toEqual([
      SEEDED_CREW_IDS.atCap,
      SEEDED_CREW_IDS.keeper,
      SEEDED_CREW_IDS.solo,
      SEEDED_CREW_IDS.muted,
    ])
  })

  // The whole point of the at-cap crew: a full roster costs eleven accounts to
  // build by hand, so an off-by-one here quietly removes the shape.
  it('fills the at-cap crew to exactly CREW_MEMBER_CAP', async () => {
    const { rowsAt } = await run()
    const members = rowsAt<MemberRow>(MEMBERS).filter(
      (row) => row.crewId === SEEDED_CREW_IDS.atCap,
    )
    expect(members).toHaveLength(CREW_MEMBER_CAP)
    expect(new Set(members.map((row) => row.userId)).size).toBe(CREW_MEMBER_CAP)
  })

  it('puts the owner in every crew', async () => {
    const { rowsAt } = await run()
    const members = rowsAt<MemberRow>(MEMBERS)
    for (const crewId of Object.values(SEEDED_CREW_IDS)) {
      expect(
        members.some(
          (row) => row.crewId === crewId && row.userId === ownerUserId,
        ),
      ).toBe(true)
    }
  })

  // Keeper-only actions (rename, reroll, remove, handoff, delete) are
  // unreachable signed in as Hugh unless he keeps at least one crew.
  it('makes the owner keeper of the keeper and solo crews only', async () => {
    const { rowsAt } = await run()
    const ownerKept = rowsAt<CrewRow>(CREWS)
      .filter((row) => row.keeperId === ownerUserId)
      .map((row) => row.id)
    expect(ownerKept).toEqual([SEEDED_CREW_IDS.keeper, SEEDED_CREW_IDS.solo])
  })

  it('leaves the solo crew with the owner alone in it', async () => {
    const { rowsAt } = await run()
    const members = rowsAt<MemberRow>(MEMBERS).filter(
      (row) => row.crewId === SEEDED_CREW_IDS.solo,
    )
    expect(members).toEqual([expect.objectContaining({ userId: ownerUserId })])
  })

  // The roster route orders by asc(joinedAt), so a stagger that counts down
  // seats the owner — written first, and the founding member of every crew —
  // last, labelled the newest joiner. Every row is also in the past, because a
  // future join date reads as a bug rather than a fixture.
  it('stamps joins in the order members are written, all in the past', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<MemberRow & { joinedAt: Date }>(MEMBERS)
    const times = rows.map((row) => row.joinedAt.getTime())

    expect(times).toEqual([...times].sort((first, second) => first - second))
    expect(new Set(times).size).toBe(times.length)
    expect(Math.max(...times)).toBeLessThan(Date.now())
  })

  it('mutes exactly the muted crew, for the owner', async () => {
    const { rowsAt } = await run()
    expect(rowsAt<MemberRow>(MUTES)).toEqual([
      { crewId: SEEDED_CREW_IDS.muted, userId: ownerUserId },
    ])
  })

  // The join route validates the token before it resolves a crew, so a token
  // the schema rejects makes the live-invite fixture unusable — and the failure
  // looks like a dead link rather than a bad seed.
  it('mints tokens the join route will actually accept', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<{ token: string }>(INVITES)
    expect(rows.map((row) => row.token)).toEqual(
      Object.values(SEEDED_INVITE_TOKENS),
    )
    for (const row of rows) {
      expect(crewInviteTokenSchema.safeParse(row.token).success).toBe(true)
    }
  })

  it('mints a live, an expired and a revoked invite', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<{
      expiresAt: Date
      revokedAt: Date | null
    }>(INVITES)
    const now = Date.now()
    const live = rows.filter(
      (row) => row.revokedAt === null && row.expiresAt.getTime() > now,
    )
    const expired = rows.filter(
      (row) => row.revokedAt === null && row.expiresAt.getTime() <= now,
    )
    const revoked = rows.filter((row) => row.revokedAt !== null)
    expect([live, expired, revoked].map((set) => set.length)).toEqual([1, 1, 1])
  })

  // Crew shows are derived by tense: upcoming needs >= 1 member going, past
  // needs >= 2. Seeding one member on a past show is the case that must NOT
  // render, and it is the only fixture that catches a `>= 1` in that predicate.
  it('sits exactly on both tense boundaries, including the past-with-one case', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<AttendanceRow>(ATTENDANCE)
    const pastSet = new Set(pastEventIds)

    const byEvent = new Map<string, number>()
    for (const row of rows) {
      byEvent.set(row.eventId, (byEvent.get(row.eventId) ?? 0) + 1)
    }

    const upcomingCounts = [...byEvent.entries()]
      .filter(([eventId]) => !pastSet.has(eventId))
      .map(([, count]) => count)
    const pastCounts = [...byEvent.entries()]
      .filter(([eventId]) => pastSet.has(eventId))
      .map(([, count]) => count)
      .sort()

    expect(upcomingCounts).toEqual([1])
    expect(pastCounts).toEqual([1, 2])
  })

  it('marks every seeded attendance as going', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<AttendanceRow>(ATTENDANCE)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.attendingAt).toBeInstanceOf(Date)
    }
  })

  // Going and Watching are independent: the attending route upserts
  // status null, so "I'm going!" on a show you never watched stays null.
  // The past-boundary show carries one of each, so a derivation that wrongly
  // required Watching would drop it under the boundary instead of passing.
  it('puts an attending-only member on the past boundary show', async () => {
    const { rowsAt } = await run()
    const rows = rowsAt<AttendanceRow>(ATTENDANCE)
    const pastSet = new Set(pastEventIds)

    const byEvent = new Map<string, AttendanceRow[]>()
    for (const row of rows) {
      byEvent.set(row.eventId, [...(byEvent.get(row.eventId) ?? []), row])
    }
    const boundary = [...byEvent.entries()].find(
      ([eventId, group]) => pastSet.has(eventId) && group.length === 2,
    )?.[1]

    const statuses = boundary?.map((row) => row.status) ?? []
    expect(statuses).toHaveLength(2)
    expect(statuses).toContain('watching')
    expect(statuses).toContain(null)
  })

  // Reusing a watcher-crowd event would collide on the (user_id, event_id)
  // unique index and abort the entire seeder run, not just this generator.
  it('never touches an excluded event', async () => {
    const excludeEventIds = [eventIds[0]!, pastEventIds[0]!, pastEventIds[1]!]
    const { rowsAt } = await run({ excludeEventIds })
    const touched = rowsAt<AttendanceRow>(ATTENDANCE).map((row) => row.eventId)
    for (const eventId of excludeEventIds) {
      expect(touched).not.toContain(eventId)
    }
    expect(touched.length).toBeGreaterThan(0)
  })

  // The slices are disjoint, so the at-cap crew needs a crowd big enough to
  // fill it AFTER the keeper crew has taken its share. A crowd of exactly
  // CREW_MEMBER_CAP - 1 passes a naive guard and still yields a crew that is
  // merely large, silently removing the one shape this generator provides.
  it('writes nothing when the crowd cannot fill the cap after the other slices', async () => {
    const { staging, valuesSpy } = buildStagingMock()
    const result = await generateCrews({
      staging: staging as never,
      crowdUserIds: crowdUserIds.slice(0, CREW_MEMBER_CAP - 1),
      ownerUserId,
      eventIds,
      pastEventIds,
      excludeEventIds: [],
      rng: createRng(SEED),
    })
    expect(valuesSpy).not.toHaveBeenCalled()
    expect(result.insertedCrews).toBe(0)
  })

  // Every timestamp has to be day-anchored, not clock-anchored, or re-seeding
  // rewrites rows the seed says are fixed. Two runs back to back would land in
  // the same millisecond and prove nothing, so the clock is moved 22 hours
  // between them — far enough to catch Date.now(), still the same UTC day.
  // The dates live on the four child tables, not on crews itself.
  it('produces identical rows, timestamps included, across the same UTC day', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-08T01:00:00.000Z'))
      const first = await run()
      vi.setSystemTime(new Date('2026-08-08T23:00:00.000Z'))
      const second = await run()

      for (const table of [CREWS, MEMBERS, INVITES, MUTES, ATTENDANCE]) {
        expect(first.rowsAt(table)).toEqual(second.rowsAt(table))
      }
      expect(first.result).toEqual(second.result)
    } finally {
      vi.useRealTimers()
    }
  })
})
