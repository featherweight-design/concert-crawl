import { describe, it, expect, vi } from 'vitest'
import { syncVenues } from './sync-venues.js'

describe('syncVenues', () => {
  const rows = [
    {
      id: 'v1',
      slug: 'ogden-theatre',
      name: 'Ogden Theatre',
      websiteUrl: 'https://ogdentheatre.com',
    },
    {
      id: 'v2',
      slug: 'bluebird',
      name: 'Bluebird Theater',
      websiteUrl: 'https://bluebirdtheater.net',
    },
  ]

  const prod = {
    select: vi.fn(
      async (
        fn: (db: {
          select: () => { from: () => typeof rows }
        }) => Promise<typeof rows>,
      ) => fn({ select: () => ({ from: () => rows }) }),
    ),
    close: vi.fn(),
  }

  // Realistic staging rows returned by the re-select (venueIdMap re-read).
  // These simulate the rows that already exist in staging with their own uuids.
  const stagingVenueRows = [
    { id: 'staging-v1', slug: 'ogden-theatre' },
    { id: 'staging-v2', slug: 'bluebird' },
  ]

  // Staging mock: supports insert (for upsert) + select (for venueIdMap re-read).
  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (row: unknown) => ({ onConflictDoUpdate: () => upsertSpy(row) }),
    }),
    select: () => ({
      from: () => ({
        where: () =>
          Promise.resolve(stagingVenueRows as { id: string; slug: string }[]),
      }),
    }),
  })

  it('upserts one row per prod venue', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncVenues({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(2)
    expect(result.processed).toBe(2)
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenues({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(2)
    // Dry-run still builds venueIdMap via a read-only SELECT against staging.
    // Assert the prod-id → staging-id mapping is correct — downstream FK tasks depend on it.
    expect(result.venueIdMap).toBeInstanceOf(Map)
    expect(result.venueIdMap.get('v1')).toBe('staging-v1')
    expect(result.venueIdMap.get('v2')).toBe('staging-v2')
  })

  it('builds correct venueIdMap in commit mode', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncVenues({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
    })
    expect(result.venueIdMap.get('v1')).toBe('staging-v1')
    expect(result.venueIdMap.get('v2')).toBe('staging-v2')
  })
})
