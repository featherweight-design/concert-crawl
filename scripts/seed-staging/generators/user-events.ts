/**
 * Concert Crawl — synthetic staging generator: user_events.
 *
 * Creates a strategically skewed distribution of user_events rows:
 *   - Some fixture users get 0–1 rows (sparse users)
 *   - Others get 25–40 rows (power users — layout-hostile stress test)
 *
 * Rows are mixed across the three attendance shapes (#70) — watching-only,
 * watching + attending, attending-only. `status: 'going'` is retired; attendance
 * is the `attending_at` timestamp and is independent of Watching.
 * Every eventId is drawn from deps.eventIds.
 *
 * Attendance only lands on past-dated events (deps.pastEventIds), because
 * Concert History shows nights that already happened — putting attending_at on a
 * future show would leave the staging History page empty.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import { userEvents } from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type GeneratorDeps = {
  staging: DrizzleWriteDb
  fixtureUserIds: readonly string[]
  eventIds: readonly string[]
  /** Subset of eventIds whose show date is in the past. */
  pastEventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type GenResult = { inserted: number }

/**
 * The three shapes a user_events row can take since #70. The split is ~60/25/15
 * so the staging Watching list stays the dominant surface while History and the
 * attending-only edge case both have real data.
 */
export const ATTENDANCE_SHAPES = [
  'watching-only',
  'watching-attending',
  'attending-only',
] as const

export type AttendanceShape = (typeof ATTENDANCE_SHAPES)[number]

/**
 * Fixed epoch for synthetic attendance timestamps. Wall-clock time here would
 * break the same-seed-same-rows contract this file guarantees, so the only
 * variation comes from an rng-drawn day offset.
 */
const ATTENDING_EPOCH_MS = Date.UTC(2026, 0, 1)

const pickShape = (roll: number): AttendanceShape => {
  if (roll < 60) return 'watching-only'
  if (roll < 85) return 'watching-attending'
  return 'attending-only'
}

export const generateUserEvents = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, eventIds, pastEventIds, rng } = deps
  const pastEventIdSet = new Set(pastEventIds)

  const rows: {
    userId: string
    eventId: string
    status: 'watching' | null
    attendingAt: Date | null
    shape: AttendanceShape
  }[] = []

  const buildRow = (
    userId: string,
    eventId: string,
    shape: AttendanceShape,
  ): (typeof rows)[number] => {
    // Attendance is meaningless on a show that hasn't happened for History's
    // purposes, so a future event degrades to watching-only.
    const canAttend = pastEventIdSet.has(eventId)
    const attends = canAttend && shape !== 'watching-only'
    return {
      userId,
      eventId,
      status: attends && shape === 'attending-only' ? null : 'watching',
      attendingAt: attends
        ? new Date(ATTENDING_EPOCH_MS + rng.int(0, 120) * 86400000)
        : null,
      shape: attends ? shape : 'watching-only',
    }
  }

  for (const userId of fixtureUserIds) {
    // ~40% chance of being a power user (25–40 rows); otherwise 0–1 rows.
    const isPowerUser = rng.int(0, 9) < 4
    const count = isPowerUser ? rng.int(25, 40) : rng.int(0, 1)

    // Track which eventIds this user already has to avoid duplicate (userId, eventId) pairs.
    const usedEventIds = new Set<string>()

    for (
      let attempt = 0;
      attempt < count * 3 && usedEventIds.size < count;
      attempt++
    ) {
      const eventId = rng.pick(eventIds)
      if (usedEventIds.has(eventId)) continue
      usedEventIds.add(eventId)

      rows.push(buildRow(userId, eventId, pickShape(rng.int(0, 99))))
    }
  }

  // Guarantee all three attendance shapes appear across the full row set.
  // Patching must (a) recompute presence after each write so an earlier
  // patch counts as "present", and (b) pick from rows that haven't been
  // patched yet in this loop, so successive patches can't overwrite each
  // other on a small row set (which would silently leave a shape missing).
  //
  // Only a row on a past-dated event can carry attendance, so patching prefers
  // those; when no past event is in play the attending shapes are unreachable
  // and the guarantee is skipped rather than faked.
  const patchedIndices = new Set<number>()
  for (const shape of ATTENDANCE_SHAPES) {
    if (rows.length === 0) break
    const presentShapes = new Set(rows.map((row) => row.shape))
    if (presentShapes.has(shape)) continue
    const eligible: number[] = []
    for (let idx = 0; idx < rows.length; idx++) {
      if (patchedIndices.has(idx)) continue
      if (
        shape !== 'watching-only' &&
        !pastEventIdSet.has(rows[idx]!.eventId)
      ) {
        continue
      }
      eligible.push(idx)
    }
    if (eligible.length === 0) continue
    const candidateIdx = eligible[rng.int(0, eligible.length - 1)]!
    const target = rows[candidateIdx]!
    rows[candidateIdx] = buildRow(target.userId, target.eventId, shape)
    patchedIndices.add(candidateIdx)
  }

  if (rows.length > 0) {
    await staging.insert(userEvents).values(
      rows.map(({ userId, eventId, status, attendingAt }) => ({
        userId,
        eventId,
        status,
        attendingAt,
      })),
    )
  }

  return { inserted: rows.length }
}
