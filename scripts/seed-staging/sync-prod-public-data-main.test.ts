import { describe, it, expect, vi, beforeEach } from 'vitest'

// The orchestrator opens real connections, so every I/O boundary is mocked:
// postgres-js, Drizzle, the prod read-only client, and all five step modules.
// What is under test is ordering and FK plumbing — nothing else.
vi.mock('postgres', () => ({
  default: vi.fn(() => ({ end: vi.fn() })),
}))
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ __staging: true })),
}))
vi.mock('./prod-readonly-client.js', () => ({
  openProdReadonly: vi.fn(() => ({ select: vi.fn(), close: vi.fn() })),
}))
vi.mock('./sync-venues.js', () => ({
  syncVenues: vi.fn().mockResolvedValue({
    scanned: 2,
    processed: 2,
    venueIdMap: new Map([['v1', 'staging-v1']]),
  }),
}))
vi.mock('./sync-events.js', () => ({
  syncEvents: vi.fn().mockResolvedValue({
    scanned: 5,
    processed: 5,
    eventIdMap: new Map([['e1', 'staging-e1']]),
  }),
}))
vi.mock('./sync-artists.js', () => ({
  syncArtists: vi.fn().mockResolvedValue({ scanned: 3, processed: 3 }),
}))
vi.mock('./sync-price-retrieval-log.js', () => ({
  syncPriceRetrievalLog: vi.fn().mockResolvedValue({
    scanned: 7,
    inserted: 7,
    skippedMissingFk: 0,
    skippedDuplicates: 0,
  }),
}))
vi.mock('./sync-venue-guide-chips.js', () => ({
  syncVenueGuideChips: vi
    .fn()
    .mockResolvedValue({ scanned: 4, processed: 4, skippedMissingFk: 0 }),
}))

import { main } from './sync-prod-public-data.js'
import { syncVenues } from './sync-venues.js'
import { syncEvents } from './sync-events.js'
import { syncArtists } from './sync-artists.js'
import { syncPriceRetrievalLog } from './sync-price-retrieval-log.js'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'

describe('sync-prod-public-data main', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env['NEON_PROD_DIRECT'] =
      'postgres://u:p@ep-prod.us-east-2.aws.neon.tech/db'
    process.env['NEON_STAGING_DIRECT'] =
      'postgres://u:p@ep-staging.us-east-2.aws.neon.tech/db'
    process.argv = ['tsx', 'sync-prod-public-data.ts', '--dry-run']
  })

  it('runs all five steps', async () => {
    await main()
    expect(syncVenues).toHaveBeenCalledTimes(1)
    expect(syncEvents).toHaveBeenCalledTimes(1)
    expect(syncArtists).toHaveBeenCalledTimes(1)
    expect(syncPriceRetrievalLog).toHaveBeenCalledTimes(1)
    expect(syncVenueGuideChips).toHaveBeenCalledTimes(1)
  })

  it('runs the steps in FK-parent-first order', async () => {
    await main()

    // Call counts alone would stay green if the orchestrator ran the five
    // steps in any order, or in parallel via Promise.all — and the FK order is
    // the whole correctness property of this file. `invocationCallOrder` is a
    // monotonic global counter across all vi mocks, so comparing entries gives
    // the real sequence. Venues must precede events (events.venueId), events
    // must precede the price log (its event FK), and venues must precede the
    // chips (their venue FK).
    // Throws rather than casting: `noUncheckedIndexedAccess` types the index
    // read as `number | undefined`, and a cast here would turn "the step never
    // ran" into a confusing NaN comparison instead of a named failure.
    // Typed against the one thing all five steps share once mocked — a call
    // record — rather than `typeof syncVenues`: their dependency and return
    // shapes differ, so a single step's signature rejects the other four.
    const orderOf = (step: (...args: never[]) => unknown): number => {
      const order = vi.mocked(step).mock.invocationCallOrder[0]
      if (order === undefined) throw new Error('step was never invoked')
      return order
    }

    expect(orderOf(syncVenues)).toBeLessThan(orderOf(syncEvents))
    expect(orderOf(syncEvents)).toBeLessThan(orderOf(syncArtists))
    expect(orderOf(syncArtists)).toBeLessThan(orderOf(syncPriceRetrievalLog))
    expect(orderOf(syncPriceRetrievalLog)).toBeLessThan(
      orderOf(syncVenueGuideChips),
    )
  })

  it('passes the venueIdMap from syncVenues into the chip step', async () => {
    await main()
    const chipArgs = vi.mocked(syncVenueGuideChips).mock.calls[0]?.[0]
    expect(chipArgs?.venueIdMap.get('v1')).toBe('staging-v1')
  })

  it('propagates dryRun to every step', async () => {
    await main()
    for (const step of [
      syncVenues,
      syncEvents,
      syncArtists,
      syncPriceRetrievalLog,
      syncVenueGuideChips,
    ]) {
      expect(vi.mocked(step).mock.calls[0]?.[0]).toMatchObject({
        dryRun: true,
      })
    }
  })
})
