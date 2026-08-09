/**
 * Concert Crawl — synthetic staging generator: Concert Crews (#1226).
 *
 * Crews shipped with no fixture data, so every staging walk of the vertical
 * began by hand-building a crew through the UI — which is exactly the surface
 * under test. This generator stands up four crews, one per shape that is
 * awkward or slow to reach by hand:
 *
 *   at-cap  — CREW_MEMBER_CAP members, so the roster is full and any further
 *             join is refused. Reaching this by hand costs eleven accounts.
 *   keeper  — the owner IS the keeper, so rename, reroll, remove, handoff and
 *             delete are all exercisable while signed in as Hugh.
 *   solo    — the owner alone. The crew-of-one state, and the one a keeper
 *             cannot hand off before leaving.
 *   muted   — the owner is a member and has muted it, so the per-crew mute in
 *             Settings has something to show.
 *
 * Crew shows are NOT a table — they are derived by joining crew_members against
 * user_events.attending_at, gated by tense: an upcoming show needs >= 1 member
 * going, a past show needs >= 2 (D1). Both boundaries are seeded exactly, plus
 * the past-with-one case that must NOT appear, because an off-by-one in that
 * predicate is invisible unless the fixture sits on the boundary.
 *
 * Crew ids are FIXED, not generated, and live in the fixture registry alongside
 * the user ids so cleanup can delete exactly them.
 *
 * Membership is drawn from the watcher-crowd accounts, which already carry
 * profiles by the time this runs. That is deliberate: the roster reads
 * `user_profiles.handle`, and the crowd pool includes handle-less members, so
 * the nameless-entry fallback gets covered for free.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import { CREW_MEMBER_CAP } from '../../../packages/types/src/crew.js'
import {
  crews,
  crewInvites,
  crewMembers,
  crewMutes,
  userEvents,
} from '../../../packages/db/src/schema/index.js'
import { SEEDED_CREW_IDS } from '../fixture-users.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type CrewsDeps = {
  staging: DrizzleWriteDb
  /** Profile-only accounts, reused as crew members. */
  crowdUserIds: readonly string[]
  ownerUserId: string
  eventIds: readonly string[]
  pastEventIds: readonly string[]
  /**
   * Events the watcher-crowd generator already wrote crowd rows for. Reused
   * here they would collide on the (user_id, event_id) unique index and abort
   * the whole run.
   */
  excludeEventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type CrewsResult = {
  insertedCrews: number
  insertedMembers: number
  insertedInvites: number
  insertedMutes: number
  insertedUserEvents: number
}

/**
 * Invite tokens, fixed so the live link can be pasted into a staging browser
 * without a DB round trip. Each is exactly 12 base64url characters because
 * `crewInviteTokenSchema` bounds the join route's input to that shape — a
 * longer readable token would be rejected before the crew is ever resolved.
 */
export const SEEDED_INVITE_TOKENS = {
  live: 'seedLIVEkeep',
  expired: 'seedEXPIkeep',
  revoked: 'seedREVOkeep',
} as const

/** Members in the muted crew, over and above the owner. */
const MUTED_CREW_OTHERS = 4

/** Members in the keeper crew, over and above the owner. */
const KEEPER_CREW_OTHERS = 3

/**
 * Crowd accounts needed to cut all three slices disjointly. Below this the
 * at-cap crew comes up short and the generator produces a crew that is merely
 * large, which is the one shape it exists to guarantee.
 */
const REQUIRED_CROWD_SIZE =
  KEEPER_CREW_OTHERS + (CREW_MEMBER_CAP - 1) + MUTED_CREW_OTHERS

const DAY_MS = 24 * 60 * 60 * 1000

export const generateCrews = async (deps: CrewsDeps): Promise<CrewsResult> => {
  const {
    staging,
    crowdUserIds,
    ownerUserId,
    eventIds,
    pastEventIds,
    excludeEventIds,
    rng,
  } = deps

  const empty: CrewsResult = {
    insertedCrews: 0,
    insertedMembers: 0,
    insertedInvites: 0,
    insertedMutes: 0,
    insertedUserEvents: 0,
  }

  if (crowdUserIds.length < REQUIRED_CROWD_SIZE) return empty

  // Anchored to UTC midnight rather than the clock, so re-seeding twice in a
  // day writes byte-identical rows — the same-seed contract every sibling
  // generator keeps via a fixed epoch. A fixed epoch is wrong here because the
  // live invite has to still be live whenever the seeder is next run.
  const now = new Date().setUTCHours(0, 0, 0, 0)

  // Draw disjoint slices so no account lands in two crews with a stale handle
  // in one of them. The head of the crowd pool is where the handle-less
  // accounts live, so the keeper crew takes from there on purpose.
  const keeperMembers = crowdUserIds.slice(0, KEEPER_CREW_OTHERS)
  const atCapMembers = crowdUserIds.slice(
    KEEPER_CREW_OTHERS,
    KEEPER_CREW_OTHERS + CREW_MEMBER_CAP - 1,
  )
  const mutedMembers = crowdUserIds.slice(
    KEEPER_CREW_OTHERS + CREW_MEMBER_CAP - 1,
    KEEPER_CREW_OTHERS + CREW_MEMBER_CAP - 1 + MUTED_CREW_OTHERS,
  )

  // Every slice above is full, guaranteed by the REQUIRED_CROWD_SIZE guard.
  const atCapKeeperId = atCapMembers[0]!
  const mutedKeeperId = mutedMembers[0]!

  const crewRows = [
    {
      id: SEEDED_CREW_IDS.atCap,
      name: 'Sold Out Every Time',
      keeperId: atCapKeeperId,
      patchSalt: rng.int(0, 999),
    },
    {
      id: SEEDED_CREW_IDS.keeper,
      name: 'Thursday Regulars',
      keeperId: ownerUserId,
      patchSalt: rng.int(0, 999),
    },
    {
      id: SEEDED_CREW_IDS.solo,
      name: 'Party Of One',
      keeperId: ownerUserId,
      patchSalt: rng.int(0, 999),
    },
    {
      id: SEEDED_CREW_IDS.muted,
      name: 'Loud Ones',
      keeperId: mutedKeeperId,
      patchSalt: rng.int(0, 999),
    },
  ]

  await staging.insert(crews).values(crewRows)

  // joinedAt is staggered so the roster has a stable, meaningful order rather
  // than four rows landing on the same defaultNow() and sorting arbitrarily.
  let joinOffset = 0
  const joinedAt = (): Date => new Date(now - (joinOffset += 3600_000))

  const memberRows: { crewId: string; userId: string; joinedAt: Date }[] = []
  const addMembers = (crewId: string, userIds: readonly string[]): void => {
    for (const userId of userIds) {
      memberRows.push({ crewId, userId, joinedAt: joinedAt() })
    }
  }

  // The owner is in all four, because a crew he cannot open is not a fixture.
  addMembers(SEEDED_CREW_IDS.atCap, [ownerUserId, ...atCapMembers.slice(1)])
  addMembers(SEEDED_CREW_IDS.keeper, [ownerUserId, ...keeperMembers])
  addMembers(SEEDED_CREW_IDS.solo, [ownerUserId])
  addMembers(SEEDED_CREW_IDS.muted, [ownerUserId, ...mutedMembers.slice(1)])

  // Both keepers were skipped by the slice(1) calls above.
  memberRows.push({
    crewId: SEEDED_CREW_IDS.atCap,
    userId: atCapKeeperId,
    joinedAt: joinedAt(),
  })
  memberRows.push({
    crewId: SEEDED_CREW_IDS.muted,
    userId: mutedKeeperId,
    joinedAt: joinedAt(),
  })

  await staging.insert(crewMembers).values(memberRows)

  // Three invites on the keeper crew: the live one the sheet re-displays, plus
  // an expired and a revoked one. Only the live one may ever be handed out, so
  // the other two exist to prove the API refuses them rather than to be used.
  const inviteRows = [
    {
      crewId: SEEDED_CREW_IDS.keeper,
      token: SEEDED_INVITE_TOKENS.live,
      createdBy: ownerUserId,
      expiresAt: new Date(now + 7 * DAY_MS),
      revokedAt: null,
      revokedBy: null,
    },
    {
      crewId: SEEDED_CREW_IDS.keeper,
      token: SEEDED_INVITE_TOKENS.expired,
      createdBy: ownerUserId,
      expiresAt: new Date(now - DAY_MS),
      revokedAt: null,
      revokedBy: null,
    },
    {
      crewId: SEEDED_CREW_IDS.keeper,
      token: SEEDED_INVITE_TOKENS.revoked,
      createdBy: ownerUserId,
      expiresAt: new Date(now + 7 * DAY_MS),
      revokedAt: new Date(now - 2 * DAY_MS),
      revokedBy: ownerUserId,
    },
  ]

  await staging.insert(crewInvites).values(inviteRows)

  const muteRows = [{ crewId: SEEDED_CREW_IDS.muted, userId: ownerUserId }]
  await staging.insert(crewMutes).values(muteRows)

  // ---------------------------------------------------------------------
  // Crew shows, seeded exactly on the tense boundary.
  // ---------------------------------------------------------------------

  const excluded = new Set(excludeEventIds)
  const pastSet = new Set(pastEventIds)
  const usablePast = pastEventIds.filter((id) => !excluded.has(id))
  const usableUpcoming = eventIds.filter(
    (id) => !excluded.has(id) && !pastSet.has(id),
  )

  const attendanceRows: {
    userId: string
    eventId: string
    status: 'watching' | null
    attendingAt: Date
  }[] = []

  /**
   * `status` carries the Watching relationship and is independent of going:
   * the attending route upserts `status: null`, so tapping "I'm going!" on a
   * show you never watched leaves it null forever. Crew shows derive from
   * attendingAt alone and must count those members too.
   */
  const markGoing = (
    eventId: string,
    goers: readonly { userId: string; status: 'watching' | null }[],
  ): void => {
    for (const { userId, status } of goers) {
      attendanceRows.push({
        userId,
        eventId,
        status,
        attendingAt: new Date(now - DAY_MS),
      })
    }
  }

  const watcher = { userId: keeperMembers[0]!, status: 'watching' as const }
  const attendingOnly = { userId: keeperMembers[1]!, status: null }

  // Upcoming needs >= 1 going, so one member is the boundary and must render.
  const upcomingOne = usableUpcoming[0]
  if (upcomingOne) markGoing(upcomingOne, [watcher])

  // Past needs >= 2. One member is BELOW the boundary and must not render —
  // this is the row that catches a `>= 1` where the predicate wants `>= 2`.
  const pastOne = usablePast[0]
  if (pastOne) markGoing(pastOne, [watcher])

  // Two members is the past boundary and must render. The second is
  // attending-only on purpose: if the derivation ever required a Watching
  // relationship, this show would silently fall back under the boundary, and
  // an all-watching fixture would hide that.
  const pastTwo = usablePast[1]
  if (pastTwo) markGoing(pastTwo, [watcher, attendingOnly])

  if (attendanceRows.length > 0) {
    await staging.insert(userEvents).values(attendanceRows)
  }

  return {
    insertedCrews: crewRows.length,
    insertedMembers: memberRows.length,
    insertedInvites: inviteRows.length,
    insertedMutes: muteRows.length,
    insertedUserEvents: attendanceRows.length,
  }
}
