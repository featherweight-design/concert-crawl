/**
 * Concert Crawl — tests for the two owner/crowd generators.
 *
 * These cover the boundaries the generators exist to reach: the 25-entry cap on
 * the watchers roster, `total` exceeding `named` via handle-less watchers, and
 * a Concert History that only ever lands on past-dated events.
 */

import { describe, it, expect, vi } from 'vitest'
import { createRng } from '../seeded-rng.js'
import {
  generateWatcherCrowd,
  SHOWCASE_WATCHER_COUNTS,
  MIXED_SHOWCASE_HANDLELESS,
} from './watcher-crowd.js'
import { generateOwnerHistory, OWNER_HISTORY_TARGET } from './owner-history.js'

const SEED = 202607_12
const ownerUserId = 'user_2owner'
const crowdUserIds = Array.from(
  { length: 40 },
  (_, idx) => `user_2crowd_${String(idx).padStart(4, '0')}`,
)

const eventIds = Array.from(
  { length: 50 },
  (_, idx) =>
    `evt-00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
)
const pastEventIds = eventIds.slice(0, 25)
const upcomingEventIds = eventIds.slice(25)

/**
 * Captures every insert().values() call along with the table handed to
 * insert(), so tests can tell profile rows from user_events rows.
 */
function buildStagingMock() {
  const calls: { table: unknown; rows: unknown[] }[] = []
  const staging = {
    insert: vi.fn().mockImplementation((table: unknown) => ({
      values: vi.fn().mockImplementation((rows: unknown[]) => {
        calls.push({ table, rows })
        return Promise.resolve([])
      }),
    })),
  }
  return { staging, calls }
}

type WatchRow = { userId: string; eventId: string; status: string | null }
type HistoryRow = {
  userId: string
  eventId: string
  status: string | null
  attendingAt: Date
  savedPrice?: string
}

describe('generateWatcherCrowd', () => {
  const run = async () => {
    const { staging, calls } = buildStagingMock()
    const result = await generateWatcherCrowd({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staging: staging as any,
      crowdUserIds,
      ownerUserId,
      eventIds,
      pastEventIds,
      rng: createRng(SEED),
    })
    const profileRows = calls[0]?.rows ?? []
    const watchRows = (calls[1]?.rows ?? []) as WatchRow[]
    return { result, profileRows, watchRows }
  }

  it('gives every crowd member a profile', async () => {
    const { result, profileRows } = await run()
    expect(profileRows).toHaveLength(crowdUserIds.length)
    expect(result.insertedProfiles).toBe(crowdUserIds.length)
  })

  it('leaves exactly the opt-out members without a handle', async () => {
    const { profileRows } = await run()
    const handleless = profileRows.filter(
      (row) => (row as { handle: string | null }).handle === null,
    )
    expect(handleless).toHaveLength(MIXED_SHOWCASE_HANDLELESS)
  })

  it('keeps handles within what PATCH /v1/users/me would accept', async () => {
    const { profileRows } = await run()
    const handles = profileRows
      .map((row) => (row as { handle: string | null }).handle)
      .filter((handle): handle is string => handle !== null)
    for (const handle of handles) {
      // Namespaced so a real staging user's handle can never collide.
      expect(handle.startsWith('sc_')).toBe(true)
      expect(handle.length).toBeGreaterThanOrEqual(3)
      expect(handle.length).toBeLessThanOrEqual(20)
      expect(handle).toMatch(/^[a-z0-9_]+$/)
    }
    // Near-cap entries still exist, so the roster exercises overflow.
    expect(handles.some((handle) => handle.length === 20)).toBe(true)
    expect(new Set(handles).size).toBe(handles.length)
  })

  it('puts the deep showcase over the 25-entry named roster cap', async () => {
    const { result, watchRows } = await run()
    const deepEventId = result.showcaseEventIds[0]!
    const watchers = watchRows.filter((row) => row.eventId === deepEventId)
    // +1 for the owner, who is excluded from their own roster at read time.
    expect(watchers).toHaveLength(SHOWCASE_WATCHER_COUNTS[0] + 1)
    expect(SHOWCASE_WATCHER_COUNTS[0]).toBeGreaterThan(25)
  })

  it('makes the mixed showcase draw in the handle-less members', async () => {
    const { result, profileRows, watchRows } = await run()
    const mixedEventId = result.showcaseEventIds[1]!
    const handlelessIds = new Set(
      profileRows
        .filter((row) => (row as { handle: string | null }).handle === null)
        .map((row) => (row as { userId: string }).userId),
    )
    const watchers = watchRows.filter((row) => row.eventId === mixedEventId)
    const handlelessWatchers = watchers.filter((row) =>
      handlelessIds.has(row.userId),
    )
    expect(handlelessWatchers).toHaveLength(MIXED_SHOWCASE_HANDLELESS)
    // total > named is the point — some watchers never appear in the roster.
    expect(handlelessWatchers.length).toBeGreaterThan(0)
    expect(watchers.length).toBeGreaterThan(handlelessWatchers.length)
  })

  it('adds the owner to every showcase so the counts are visible to them', async () => {
    const { result, watchRows } = await run()
    for (const eventId of result.showcaseEventIds) {
      expect(
        watchRows.some(
          (row) => row.userId === ownerUserId && row.eventId === eventId,
        ),
      ).toBe(true)
    }
  })

  it('prefers upcoming events — a roster on a past show is unreachable', async () => {
    const { result } = await run()
    const upcoming = new Set(upcomingEventIds)
    for (const eventId of result.showcaseEventIds) {
      expect(upcoming.has(eventId)).toBe(true)
    }
  })

  it('never writes attendance — watching and attending are independent', async () => {
    const { watchRows } = await run()
    for (const row of watchRows) {
      expect(row.status).toBe('watching')
      expect((row as { attendingAt: Date | null }).attendingAt).toBeNull()
    }
  })

  it('produces nothing when there are no events', async () => {
    const { staging, calls } = buildStagingMock()
    const result = await generateWatcherCrowd({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staging: staging as any,
      crowdUserIds,
      ownerUserId,
      eventIds: [],
      pastEventIds: [],
      rng: createRng(SEED),
    })
    expect(calls).toHaveLength(0)
    expect(result.insertedProfiles).toBe(0)
    expect(result.showcaseEventIds).toEqual([])
  })
})

describe('generateOwnerHistory', () => {
  const run = async (excludeEventIds: readonly string[] = []) => {
    const { staging, calls } = buildStagingMock()
    const result = await generateOwnerHistory({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staging: staging as any,
      ownerUserId,
      pastEventIds,
      excludeEventIds,
      rng: createRng(SEED),
    })
    return { result, rows: (calls[0]?.rows ?? []) as HistoryRow[] }
  }

  it('seeds the target number of nights', async () => {
    const { result, rows } = await run()
    expect(rows).toHaveLength(OWNER_HISTORY_TARGET)
    expect(result.inserted).toBe(OWNER_HISTORY_TARGET)
  })

  it('attributes every row to the owner and only the owner', async () => {
    const { rows } = await run()
    for (const row of rows) {
      expect(row.userId).toBe(ownerUserId)
    }
  })

  it('only ever attends past-dated events', async () => {
    const { rows } = await run()
    const past = new Set(pastEventIds)
    for (const row of rows) {
      expect(past.has(row.eventId)).toBe(true)
      expect(row.attendingAt).toBeInstanceOf(Date)
    }
  })

  it('skips events the watcher crowd already claimed for the owner', async () => {
    const excluded = pastEventIds.slice(0, 3)
    const { rows } = await run(excluded)
    for (const row of rows) {
      expect(excluded).not.toContain(row.eventId)
    }
  })

  it('never writes the same event twice', async () => {
    const { rows } = await run()
    expect(new Set(rows.map((row) => row.eventId)).size).toBe(rows.length)
  })

  it('mixes attending-only rows in with watching+attending ones', async () => {
    const { rows } = await run()
    const statuses = new Set(rows.map((row) => row.status))
    expect(statuses.has(null)).toBe(true)
    expect(statuses.has('watching')).toBe(true)
  })

  it('leaves some nights without a price so totalSpent has to cope', async () => {
    const { rows } = await run()
    expect(rows.some((row) => row.savedPrice === undefined)).toBe(true)
    expect(rows.some((row) => row.savedPrice !== undefined)).toBe(true)
  })

  it('caps at the number of past events available', async () => {
    const { staging, calls } = buildStagingMock()
    await generateOwnerHistory({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staging: staging as any,
      ownerUserId,
      pastEventIds: pastEventIds.slice(0, 4),
      excludeEventIds: [],
      rng: createRng(SEED),
    })
    expect(calls[0]?.rows).toHaveLength(4)
  })

  it('produces nothing when no past events exist', async () => {
    const { staging, calls } = buildStagingMock()
    const result = await generateOwnerHistory({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staging: staging as any,
      ownerUserId,
      pastEventIds: [],
      excludeEventIds: [],
      rng: createRng(SEED),
    })
    expect(calls).toHaveLength(0)
    expect(result.inserted).toBe(0)
  })
})
