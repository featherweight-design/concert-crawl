import { describe, it, expect, vi } from 'vitest'
import { syncPriceRetrievalLog } from './sync-price-retrieval-log.js'

// Fixed reference time used across tests — rows at this time are within the
// 30-day rolling window.
const TEST_NOW = new Date('2026-07-11T12:00:00Z')

// Shared fixture row shape used across tests.
const baseProdRow = {
  id: 'prod-log-1',
  eventId: 'prod-e1',
  venueId: 'prod-v1',
  source: 'ticketmaster' as const,
  outcome: 'hit' as const,
  latencyMs: 120,
  errorMessage: null,
  attemptedAt: new Date('2026-07-10T03:00:00Z'),
}

function makeProd(rows: (typeof baseProdRow)[]) {
  return {
    select: vi.fn(async (fn: (db: unknown) => Promise<typeof rows>) =>
      fn({
        select: () => ({
          from: () => ({
            where: () => Promise.resolve(rows),
          }),
        }),
      }),
    ),
    close: vi.fn(),
  }
}

describe('syncPriceRetrievalLog', () => {
  it('inserts a row when no duplicate exists in staging', async () => {
    const insertSpy = vi.fn().mockResolvedValue(undefined)

    const prod = makeProd([baseProdRow])
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    const eventIdMap = new Map([['prod-e1', 'staging-e1']])

    // Staging: prefetch SELECT returns empty → no existing keys → insert proceeds.
    const staging = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve(
              [] as { eventId: string; source: string; attemptedAt: Date }[],
            ),
        }),
      }),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(1)
    expect(result.skippedMissingFk).toBe(0)
    expect(result.skippedDuplicates).toBe(0)
    expect(insertSpy).toHaveBeenCalledTimes(1)

    // Verify id is NOT passed — Drizzle assigns fresh uuid via defaultRandom().
    const insertedValues = insertSpy.mock.calls[0][0] as Record<string, unknown>
    expect(insertedValues).not.toHaveProperty('id')

    // Verify FK translation was applied.
    expect(insertedValues['venueId']).toBe('staging-v1')
    expect(insertedValues['eventId']).toBe('staging-e1')
  })

  it('skips insert when a duplicate (event_id, source, attempted_at) exists', async () => {
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    const eventIdMap = new Map([['prod-e1', 'staging-e1']])

    // Staging: prefetch SELECT returns the matching key → duplicate detected → skip.
    const staging = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                eventId: 'staging-e1',
                source: baseProdRow.source,
                attemptedAt: baseProdRow.attemptedAt,
              },
            ] as { eventId: string; source: string; attemptedAt: Date }[]),
        }),
      }),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.skippedDuplicates).toBe(1)
    expect(result.skippedMissingFk).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('skips row when prod venueId is not in venueIdMap and logs a warning', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    // venueIdMap is empty — prod-v1 has no staging equivalent.
    const venueIdMap = new Map<string, string>()
    const eventIdMap = new Map([['prod-e1', 'staging-e1']])

    // All rows fail FK translation — staging.select (prefetch) is never called.
    const staging = {
      select: vi.fn(),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.skippedMissingFk).toBe(1)
    expect(result.skippedDuplicates).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(staging.select).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('skips row when prod eventId is not in eventIdMap and logs a warning', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    // eventIdMap is empty — prod-e1 has no staging equivalent.
    const eventIdMap = new Map<string, string>()

    // All rows fail FK translation — staging.select (prefetch) is never called.
    const staging = {
      select: vi.fn(),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.skippedMissingFk).toBe(1)
    expect(result.skippedDuplicates).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(staging.select as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('makes no writes but still prefetches for accurate would-insert counts in dryRun', async () => {
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    const eventIdMap = new Map([['prod-e1', 'staging-e1']])

    // Dry-run now runs the read-only prefetch SELECT so the "would insert"
    // count subtracts rows already present in staging. Mock returns empty:
    // nothing already in staging → the sole prod row counts as would-insert.
    const staging = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve(
              [] as { eventId: string; source: string; attemptedAt: Date }[],
            ),
        }),
      }),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: true,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(1)
    expect(result.skippedMissingFk).toBe(0)
    expect(result.skippedDuplicates).toBe(0)
    // Absolutely no INSERT — the prefetch SELECT is read-only.
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('subtracts already-present rows from would-insert count in dryRun', async () => {
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    const eventIdMap = new Map([['prod-e1', 'staging-e1']])

    // Staging prefetch returns a row that matches the prod row's composite
    // → dry-run should report skippedDuplicates=1, inserted=0.
    const staging = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                eventId: 'staging-e1',
                source: baseProdRow.source,
                attemptedAt: baseProdRow.attemptedAt,
              },
            ] as { eventId: string; source: string; attemptedAt: Date }[]),
        }),
      }),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: true,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.skippedDuplicates).toBe(1)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('counts FK-missing rows as skipped in dry-run without calling staging.select', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const selectSpy = vi.fn()
    const insertSpy = vi.fn()

    const prod = makeProd([baseProdRow])
    // Missing both maps.
    const venueIdMap = new Map<string, string>()
    const eventIdMap = new Map<string, string>()

    const staging = {
      select: selectSpy,
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: true,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.skippedMissingFk).toBe(1)
    expect(result.skippedDuplicates).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(selectSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('handles multiple rows with mixed FK outcomes correctly', async () => {
    const rows = [
      {
        ...baseProdRow,
        id: 'prod-log-1',
        eventId: 'prod-e1',
        venueId: 'prod-v1',
      },
      {
        ...baseProdRow,
        id: 'prod-log-2',
        eventId: 'prod-e2',
        venueId: 'prod-v1',
      }, // missing event
      {
        ...baseProdRow,
        id: 'prod-log-3',
        eventId: 'prod-e3',
        venueId: 'prod-v-missing',
      }, // missing venue
    ]

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const insertSpy = vi.fn().mockResolvedValue(undefined)

    const prod = makeProd(rows as any)
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])
    const eventIdMap = new Map([['prod-e1', 'staging-e1']]) // only e1 maps

    // No duplicates exist in staging — prefetch returns empty.
    const staging = {
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve(
              [] as { eventId: string; source: string; attemptedAt: Date }[],
            ),
        }),
      }),
      insert: () => ({
        values: insertSpy,
      }),
    }

    const result = await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap,
      eventIdMap,
      now: TEST_NOW,
    })

    expect(result.scanned).toBe(3)
    expect(result.inserted).toBe(1)
    expect(result.skippedMissingFk).toBe(2)
    expect(result.skippedDuplicates).toBe(0)
    expect(insertSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('passes a WHERE clause to the prod select (rolling-window narrowing)', async () => {
    // Verify that prod.select receives a query builder that calls .where() —
    // confirming the rolling window gte filter is applied rather than a full
    // table read. We capture the db-stub call and assert it was chained with
    // .where(...) before returning results.
    const whereSpy = vi.fn().mockResolvedValue([])
    const fromSpy = vi.fn(() => ({ where: whereSpy }))
    const selectSpy = vi.fn(() => ({ from: fromSpy }))

    const prod = {
      select: vi.fn(
        async (fn: (db: unknown) => Promise<(typeof baseProdRow)[]>) =>
          fn({ select: selectSpy }),
      ),
      close: vi.fn(),
    }

    // No translated rows (empty maps) — prefetch SELECT is never called.
    const staging = {
      select: vi.fn(),
      insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
    }

    await syncPriceRetrievalLog({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      venueIdMap: new Map(),
      eventIdMap: new Map(),
      now: TEST_NOW,
    })

    // The prod select chain must have called .where() — proving a filter was
    // applied, not a full table scan.
    expect(whereSpy).toHaveBeenCalledTimes(1)
  })
})
