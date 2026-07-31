/**
 * Concert Crawl — synthetic staging generator: Concert History for the owner.
 *
 * The five fixture users get history from generators/user-events.ts, but none
 * of them is an account Hugh signs into, so staging History renders empty for
 * the person testing it. This generator gives the owner account a run of past
 * nights of its own.
 *
 * History's stats block (nights, venues, artists, topGenre, topVenue,
 * first/last date, totalSpent) only says anything interesting with enough rows
 * to have a *top* anything, hence the target below rather than a handful.
 *
 * Attendance lands exclusively on past-dated events — GET /v1/history filters
 * `attending_at IS NOT NULL AND date < today`, so an attending row on an
 * upcoming show contributes nothing.
 *
 * Only user_events are written. The owner's profile, feedback, notifications
 * and price submissions are real rows and are never touched.
 *
 * All random draws go through deps.rng — never Math.random().
 */

import { userEvents } from '../../../packages/db/src/schema/index.js'
import type { DrizzleWriteDb } from '../sync-venues.js'
import type { createRng } from '../seeded-rng.js'

export type OwnerHistoryDeps = {
  staging: DrizzleWriteDb
  ownerUserId: string
  pastEventIds: readonly string[]
  /** Events already claimed by the watcher-crowd generator for this owner. */
  excludeEventIds: readonly string[]
  rng: ReturnType<typeof createRng>
}

export type OwnerHistoryResult = { inserted: number }

/** Past nights to give the owner, capped by how many past events exist. */
export const OWNER_HISTORY_TARGET = 18

/**
 * Share of the owner's history that is attending-only (`status: null`) — the
 * shape produced by tapping "I'm going!" without ever watching the show. The
 * rest keep Watching alongside the attendance, so both rows render in History
 * and only the latter also appears under Watching.
 */
const ATTENDING_ONLY_EVERY = 3

/**
 * Fixed epoch for synthetic attendance timestamps, matching user-events.ts.
 * Wall-clock time would break the same-seed-same-rows contract.
 */
const ATTENDING_EPOCH_MS = Date.UTC(2026, 0, 1)

/**
 * Prices are what History sums into totalSpent. A null means the night is free
 * or the price was never captured, which the stats block has to survive.
 */
const SAVED_PRICES = [
  '28.00',
  '45.00',
  '65.00',
  '85.00',
  '120.00',
  null,
] as const

export const generateOwnerHistory = async (
  deps: OwnerHistoryDeps,
): Promise<OwnerHistoryResult> => {
  const { staging, ownerUserId, pastEventIds, excludeEventIds, rng } = deps

  const excluded = new Set(excludeEventIds)
  const eligible = pastEventIds.filter((eventId) => !excluded.has(eventId))

  if (eligible.length === 0) {
    console.warn(
      '[synthetic] WARNING: no past-dated events in staging — the owner ' +
        'Concert History generator produced no rows. Run ' +
        'pnpm db:seed:staging:sync first.',
    )
    return { inserted: 0 }
  }

  const count = Math.min(OWNER_HISTORY_TARGET, eligible.length)

  const rows = eligible.slice(0, count).map((eventId, idx) => {
    const savedPrice = rng.pick(SAVED_PRICES)
    return {
      userId: ownerUserId,
      eventId,
      status: idx % ATTENDING_ONLY_EVERY === 0 ? null : ('watching' as const),
      attendingAt: new Date(ATTENDING_EPOCH_MS + rng.int(0, 180) * 86400000),
      ...(savedPrice === null ? {} : { savedPrice }),
    }
  })

  await staging.insert(userEvents).values(rows)

  return { inserted: rows.length }
}
