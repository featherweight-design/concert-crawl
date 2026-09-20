import { describe, it, expect, vi } from 'vitest'
import { syncVenueGuideChips } from './sync-venue-guide-chips.js'

describe('syncVenueGuideChips', () => {
  const rows = [
    {
      id: 'c1',
      venueId: 'v1',
      chipType: 'parking',
      body: 'Street parking fills up by 7.',
      isPlaceholder: false,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
    {
      id: 'c2',
      venueId: 'v-unknown',
      chipType: 'bag-policy',
      body: 'Small bags only.',
      isPlaceholder: false,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
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

  const stagingFor = (upsertSpy: ReturnType<typeof vi.fn>) => ({
    insert: () => ({
      values: (row: unknown) => ({ onConflictDoUpdate: () => upsertSpy(row) }),
    }),
  })

  const venueIdMap = new Map([['v1', 'staging-v1']])

  it('upserts with the translated staging venueId and skips unmapped parents', async () => {
    const upsertSpy = vi.fn().mockResolvedValue([])
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
      venueIdMap,
    })
    expect(upsertSpy).toHaveBeenCalledTimes(1)
    expect(upsertSpy.mock.calls[0]?.[0]).toMatchObject({
      venueId: 'staging-v1',
      chipType: 'parking',
    })
    expect(upsertSpy.mock.calls[0]?.[0]).not.toHaveProperty('id')
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(1)
    expect(result.skippedMissingFk).toBe(1)
  })

  it('makes no writes when dryRun is true', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: true,
      venueIdMap,
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(2)
    expect(result.processed).toBe(1)
    expect(result.skippedMissingFk).toBe(1)
  })

  it('skips every row when the venueIdMap is empty', async () => {
    const upsertSpy = vi.fn()
    const result = await syncVenueGuideChips({
      prod: prod as any,
      staging: stagingFor(upsertSpy) as any,
      dryRun: false,
      venueIdMap: new Map(),
    })
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.processed).toBe(0)
    expect(result.skippedMissingFk).toBe(2)
  })
})
