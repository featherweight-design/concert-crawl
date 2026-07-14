import { describe, it, expect, vi } from 'vitest'
import { rollingWindow } from './sync-events-helpers.js'
import { syncEvents } from './sync-events.js'

describe('rollingWindow', () => {
  it('returns fromDate 30 days before now', () => {
    expect(rollingWindow(new Date('2026-07-12T18:00:00Z'))).toEqual({
      fromDate: '2026-06-12',
    })
  })

  it('returns the same fromDate for a midnight-UTC input as for the same day', () => {
    expect(rollingWindow(new Date('2026-07-12T00:00:00Z')).fromDate).toBe(
      '2026-06-12',
    )
  })
})

describe('syncEvents', () => {
  it('splits upserts by status: upcoming → onConflictDoUpdate, cancelled → UPDATE when natural key matches', async () => {
    const upcomingUpdateSpy = vi.fn().mockResolvedValue(undefined)
    const cancelledUpdateSpy = vi.fn().mockResolvedValue(undefined)
    const cancelledNothingSpy = vi.fn().mockResolvedValue(undefined)

    // Three prod event rows: 2 upcoming, 1 cancelled.
    const prodEventRows = [
      {
        id: 'prod-e1',
        venueId: 'prod-v1',
        title: 'Band A',
        artist: 'Band A',
        date: '2026-07-15',
        doorsTime: null,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        ticketPriceMin: null,
        ticketPriceMax: null,
        priceSource: null,
        pipelineExhaustedAt: null,
        description: null,
        imageUrl: null,
        genre: [],
        status: 'upcoming' as const,
        confidenceScore: null,
        verified: false,
        hiddenFromConsumer: false,
        isConcertReviewNeeded: false,
        setlist: null,
        sourceUrl: null,
        sourceHash: null,
        extractionStrategy: null,
        canonicalArtist: 'band-a',
        canonicalTitle: 'band-a',
        lastSeenAt: new Date('2026-07-10T00:00:00Z'),
        firstMissingAt: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-10T00:00:00Z'),
      },
      {
        id: 'prod-e2',
        venueId: 'prod-v1',
        title: 'Band B',
        artist: 'Band B',
        date: '2026-07-20',
        doorsTime: null,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        ticketPriceMin: null,
        ticketPriceMax: null,
        priceSource: null,
        pipelineExhaustedAt: null,
        description: null,
        imageUrl: null,
        genre: [],
        status: 'upcoming' as const,
        confidenceScore: null,
        verified: false,
        hiddenFromConsumer: false,
        isConcertReviewNeeded: false,
        setlist: null,
        sourceUrl: null,
        sourceHash: null,
        extractionStrategy: null,
        canonicalArtist: 'band-b',
        canonicalTitle: 'band-b',
        lastSeenAt: new Date('2026-07-10T00:00:00Z'),
        firstMissingAt: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-10T00:00:00Z'),
      },
      {
        id: 'prod-e3',
        venueId: 'prod-v1',
        title: 'Band C',
        artist: 'Band C',
        date: '2026-06-20',
        doorsTime: null,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        ticketPriceMin: null,
        ticketPriceMax: null,
        priceSource: null,
        pipelineExhaustedAt: null,
        description: null,
        imageUrl: null,
        genre: [],
        status: 'cancelled' as const,
        confidenceScore: null,
        verified: false,
        hiddenFromConsumer: false,
        isConcertReviewNeeded: false,
        setlist: null,
        sourceUrl: null,
        sourceHash: null,
        extractionStrategy: null,
        canonicalArtist: 'band-c',
        canonicalTitle: 'band-c',
        lastSeenAt: new Date('2026-07-01T00:00:00Z'),
        firstMissingAt: null,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      },
    ]

    const prod = {
      select: vi.fn(
        async (fn: (db: unknown) => Promise<typeof prodEventRows>) =>
          fn({
            select: () => ({
              from: () => ({
                where: () => Promise.resolve(prodEventRows),
              }),
            }),
          }),
      ),
      close: vi.fn(),
    }

    // venueIdMap: prod-v1 → staging-v1
    const venueIdMap = new Map([['prod-v1', 'staging-v1']])

    // The cancelled row exists in staging under its natural key — should trigger UPDATE.
    const existingStagingCancelledRow = [{ id: 'staging-e3' }]

    // selectCallCount tracks which select() call is for the natural-key lookup vs eventIdMap.
    let selectCallCount = 0
    const staging = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: upcomingUpdateSpy,
          onConflictDoNothing: cancelledNothingSpy,
        }),
      }),
      update: () => ({
        set: () => ({
          where: cancelledUpdateSpy,
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => {
            selectCallCount++
            // First call in the loop = natural-key lookup for cancelled row.
            // Subsequent call = eventIdMap re-select (upcoming rows).
            if (selectCallCount === 1) {
              return {
                limit: () => Promise.resolve(existingStagingCancelledRow),
              }
            }
            return Promise.resolve(
              [] as {
                id: string
                venueId: string | null
                date: string
                canonicalTitle: string
              }[],
            )
          },
        }),
      }),
    }

    const result = await syncEvents({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      now: new Date('2026-07-12T18:00:00Z'),
      venueIdMap,
    })

    expect(result.scanned).toBe(3)
    expect(result.processed).toBe(3)
    // upcoming rows used onConflictDoUpdate
    expect(upcomingUpdateSpy).toHaveBeenCalledTimes(2)
    // cancelled row hit an existing staging row → UPDATE, not insert
    expect(cancelledUpdateSpy).toHaveBeenCalledTimes(1)
    expect(cancelledNothingSpy).not.toHaveBeenCalled()
    expect(result.eventIdMap).toBeInstanceOf(Map)
  })

  it('skips rows whose prod venueId is not in venueIdMap and logs a warning', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const upsertSpy = vi.fn().mockResolvedValue(undefined)

    const prodEventRows = [
      {
        id: 'prod-e1',
        venueId: 'prod-v-missing',
        title: 'Band A',
        artist: 'Band A',
        date: '2026-07-15',
        doorsTime: null,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        ticketPriceMin: null,
        ticketPriceMax: null,
        priceSource: null,
        pipelineExhaustedAt: null,
        description: null,
        imageUrl: null,
        genre: [],
        status: 'upcoming' as const,
        confidenceScore: null,
        verified: false,
        hiddenFromConsumer: false,
        isConcertReviewNeeded: false,
        setlist: null,
        sourceUrl: null,
        sourceHash: null,
        extractionStrategy: null,
        canonicalArtist: 'band-a',
        canonicalTitle: 'band-a',
        lastSeenAt: new Date('2026-07-10T00:00:00Z'),
        firstMissingAt: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-10T00:00:00Z'),
      },
    ]

    const prod = {
      select: vi.fn(
        async (fn: (db: unknown) => Promise<typeof prodEventRows>) =>
          fn({
            select: () => ({
              from: () => ({
                where: () => Promise.resolve(prodEventRows),
              }),
            }),
          }),
      ),
      close: vi.fn(),
    }

    // Empty venueIdMap — the row's venue is not present.
    const venueIdMap = new Map<string, string>()

    const staging = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: upsertSpy,
          onConflictDoNothing: upsertSpy,
        }),
      }),
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve(
              [] as {
                id: string
                venueId: string | null
                date: string
                canonicalTitle: string
              }[],
            ),
        }),
      }),
    }

    const result = await syncEvents({
      prod: prod as any,
      staging: staging as any,
      dryRun: false,
      now: new Date('2026-07-12T18:00:00Z'),
      venueIdMap,
    })

    expect(result.scanned).toBe(1)
    expect(result.processed).toBe(0)
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('makes no writes when dryRun is true but still returns eventIdMap', async () => {
    const upsertSpy = vi.fn()

    const prodEventRows = [
      {
        id: 'prod-e1',
        venueId: 'prod-v1',
        title: 'Band A',
        artist: 'Band A',
        date: '2026-07-15',
        doorsTime: null,
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        ticketPriceMin: null,
        ticketPriceMax: null,
        priceSource: null,
        pipelineExhaustedAt: null,
        description: null,
        imageUrl: null,
        genre: [],
        status: 'upcoming' as const,
        confidenceScore: null,
        verified: false,
        hiddenFromConsumer: false,
        isConcertReviewNeeded: false,
        setlist: null,
        sourceUrl: null,
        sourceHash: null,
        extractionStrategy: null,
        canonicalArtist: 'band-a',
        canonicalTitle: 'band-a',
        lastSeenAt: new Date('2026-07-10T00:00:00Z'),
        firstMissingAt: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-10T00:00:00Z'),
      },
    ]

    const prod = {
      select: vi.fn(
        async (fn: (db: unknown) => Promise<typeof prodEventRows>) =>
          fn({
            select: () => ({
              from: () => ({
                where: () => Promise.resolve(prodEventRows),
              }),
            }),
          }),
      ),
      close: vi.fn(),
    }

    const venueIdMap = new Map([['prod-v1', 'staging-v1']])

    const staging = {
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: upsertSpy,
          onConflictDoNothing: upsertSpy,
        }),
      }),
      select: () => ({
        from: () => ({
          where: () =>
            Promise.resolve(
              [] as {
                id: string
                venueId: string | null
                date: string
                canonicalTitle: string
              }[],
            ),
        }),
      }),
    }

    const result = await syncEvents({
      prod: prod as any,
      staging: staging as any,
      dryRun: true,
      now: new Date('2026-07-12T18:00:00Z'),
      venueIdMap,
    })

    expect(upsertSpy).not.toHaveBeenCalled()
    expect(result.scanned).toBe(1)
    expect(result.processed).toBe(1)
    expect(result.eventIdMap).toBeInstanceOf(Map)
  })
})
