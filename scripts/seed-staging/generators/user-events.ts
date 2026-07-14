/**
 * Concert Crawl — synthetic staging generator: user_events.
 *
 * Creates a strategically skewed distribution of user_events rows:
 *   - Some fixture users get 0–1 rows (sparse users)
 *   - Others get 25–40 rows (power users — layout-hostile stress test)
 *
 * Status values (going / interested / watching) are mixed across all rows.
 * Every eventId is drawn from deps.eventIds.
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
  rng: ReturnType<typeof createRng>
}

export type GenResult = { inserted: number }

const STATUSES = ['going', 'interested', 'watching'] as const

export const generateUserEvents = async (
  deps: GeneratorDeps,
): Promise<GenResult> => {
  const { staging, fixtureUserIds, eventIds, rng } = deps

  const rows: {
    userId: string
    eventId: string
    status: (typeof STATUSES)[number]
  }[] = []

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

      const status = rng.pick(STATUSES)
      rows.push({ userId, eventId, status })
    }
  }

  // Guarantee all three status values appear across the full row set.
  // Patching must (a) recompute presence after each write so an earlier
  // patch counts as "present", and (b) pick from rows that haven't been
  // patched yet in this loop, so successive patches can't overwrite each
  // other on a small row set (which would silently leave a status
  // missing).
  const patchedIndices = new Set<number>()
  for (const status of STATUSES) {
    if (rows.length === 0) break
    const presentStatuses = new Set(rows.map((row) => row.status))
    if (presentStatuses.has(status)) continue
    // Prefer an unpatched slot; fall back to any row if all rows are
    // already patched (row set smaller than STATUSES.length).
    const unpatched: number[] = []
    for (let idx = 0; idx < rows.length; idx++) {
      if (!patchedIndices.has(idx)) unpatched.push(idx)
    }
    const candidateIdx =
      unpatched.length > 0
        ? unpatched[rng.int(0, unpatched.length - 1)]!
        : rng.int(0, rows.length - 1)
    rows[candidateIdx]!.status = status
    patchedIndices.add(candidateIdx)
  }

  if (rows.length > 0) {
    await staging.insert(userEvents).values(rows)
  }

  return { inserted: rows.length }
}
