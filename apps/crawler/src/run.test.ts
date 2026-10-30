import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Sentry
const mockSentryCaptureException = vi.fn()
const mockSentryLoggerInfo = vi.fn()
const mockSentryLoggerWarn = vi.fn()
const mockSentryLoggerError = vi.fn()
vi.mock('@sentry/node', () => ({
  captureException: mockSentryCaptureException,
  logger: {
    info: mockSentryLoggerInfo,
    warn: mockSentryLoggerWarn,
    error: mockSentryLoggerError,
  },
}))

// Mock DB
const mockVenues = [
  { id: 'venue-1', name: 'Ogden Theatre' },
  { id: 'venue-2', name: 'Bluebird Theater' },
  { id: 'venue-3', name: 'Red Rocks' },
  { id: 'venue-4', name: 'Mission Ballroom' },
]

const mockDbUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
}

const mockDbChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(mockVenues),
  update: vi.fn().mockReturnValue(mockDbUpdate),
}
vi.mock('@concert-crawl/db', () => ({
  db: mockDbChain,
  venues: {
    id: 'id',
    name: 'name',
    active: 'active',
    verified: 'verified',
    priceUrl: 'priceUrl',
    crawlPausedAt: 'crawlPausedAt',
  },
  crawlTriggers: {
    id: 'id',
    venueId: 'venueId',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  events: {
    id: 'id',
    venueId: 'venueId',
    artist: 'artist',
    supportingArtists: 'supportingArtists',
    tourName: 'tourName',
    date: 'date',
    ticketUrl: 'ticketUrl',
    ticketPriceMin: 'ticketPriceMin',
    pipelineExhaustedAt: 'pipelineExhaustedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  lt: vi.fn(),
  sql: vi.fn(),
}))

// Mock price pipeline
const mockRunPricePipeline = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/price-pipeline', () => ({
  runPricePipeline: mockRunPricePipeline,
}))

// Mock Playwright — return a minimal browser-shaped object
const mockBrowser = {
  close: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
}
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

// Mock crawlVenue and tagEventsWithGenres
const mockCrawlVenue = vi.fn().mockResolvedValue({
  id: 'run-uuid-1',
  status: 'success',
  insertedEventIds: [],
})
const mockTagEventsWithGenres = vi.fn().mockResolvedValue(undefined)
// Contract: runArtistFanoutSafely never throws (it swallows internally), so
// the resolved-null default is its worst-case observable behavior.
const mockRunArtistFanoutSafely = vi.fn().mockResolvedValue(null)
const mockSweepStaleEvents = vi.fn().mockResolvedValue({ cancelled: 0 })
const mockEvaluateRunHealth = vi.fn<(outcomes: unknown[]) => unknown[]>(
  () => [],
)
const mockReportRunHealth = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/crawler-core', () => ({
  crawlVenue: mockCrawlVenue,
  tagEventsWithGenres: mockTagEventsWithGenres,
  runArtistFanoutSafely: mockRunArtistFanoutSafely,
  sweepStaleEvents: mockSweepStaleEvents,
  evaluateRunHealth: mockEvaluateRunHealth,
  reportRunHealth: mockReportRunHealth,
  crawlFailureGrouping: (message: string) => ({
    fingerprint: ['crawl.failed', `key:${message}`],
    errorKind: 'other',
  }),
}))

// Mock logger
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

const SUCCESSFUL_CRAWL_RUN = {
  id: 'run-uuid-1',
  status: 'success',
  eventsFound: 5,
  eventsInserted: 3,
  eventsUpdated: 2,
  durationMs: 1200,
  extractionStrategyUsed: 'structured_data',
  llmCostUsd: null,
  errorMessage: null,
  insertedEventIds: ['evt-new-1', 'evt-new-2', 'evt-new-3'],
}

describe('runDailyCrawl', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // clearAllMocks keeps implementations, so re-pin the run-health defaults
    // or one test's override would leak into the next.
    mockEvaluateRunHealth.mockReturnValue([])
    mockReportRunHealth.mockResolvedValue(undefined)
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.leftJoin.mockReturnThis()
    mockDbChain.where.mockResolvedValue(mockVenues)
    mockDbChain.update.mockReturnValue(mockDbUpdate)
    mockCrawlVenue.mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
    mockBrowser.close.mockResolvedValue(undefined)
    mockRunPricePipeline.mockResolvedValue(undefined)
    mockRunArtistFanoutSafely.mockResolvedValue(null)
    mockSentryCaptureException.mockReset()
    mockSentryLoggerInfo.mockReset()
    mockSentryLoggerWarn.mockReset()
    mockSentryLoggerError.mockReset()
  })

  it('leaves paused venues out of the daily venue list', async () => {
    const { isNull } = await import('drizzle-orm')
    // No venues means no crawl and no price query, so the only paused-venue
    // check left to make is the one on the venue list itself.
    mockDbChain.where.mockResolvedValue([])

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(vi.mocked(isNull)).toHaveBeenCalledWith('crawlPausedAt')
  })

  it('calls crawlVenue for each active venue, passing a shared lazy browser provider', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
    for (const venueId of ['venue-1', 'venue-2', 'venue-3', 'venue-4']) {
      expect(mockCrawlVenue).toHaveBeenCalledWith(
        venueId,
        expect.any(Function),
        undefined,
        expect.any(Array),
      )
    }
    const providers = new Set(mockCrawlVenue.mock.calls.map((call) => call[1]))
    expect(providers.size).toBe(1)
  })

  it('never launches Chromium unless a crawl asks for the browser provider', async () => {
    const { chromium } = await import('playwright')
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(vi.mocked(chromium.launch)).not.toHaveBeenCalled()
    expect(mockBrowser.close).not.toHaveBeenCalled()
  })

  it('launches Chromium at most once across all venues and closes it', async () => {
    const { chromium } = await import('playwright')
    mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
      await getBrowser()
      return SUCCESSFUL_CRAWL_RUN
    })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(vi.mocked(chromium.launch)).toHaveBeenCalledTimes(1)
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when a crawl throws after launching one', async () => {
    mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
      await getBrowser()
      throw new Error('blocked')
    })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('returns succeeded and failed counts', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })

  it('continues processing remaining venues when one fails', async () => {
    mockCrawlVenue
      .mockRejectedValueOnce(new Error('venue-1 blocked'))
      .mockResolvedValue({
        id: 'run-uuid-1',
        status: 'success',
        insertedEventIds: [],
      })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
  })

  it('processes venues sequentially — never more than one concurrently', async () => {
    let maxConcurrent = 0
    let currentConcurrent = 0
    mockCrawlVenue.mockImplementation(async () => {
      currentConcurrent++
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
      await new Promise((resolve) => setTimeout(resolve, 10))
      currentConcurrent--
      return { id: 'run-uuid-1', status: 'success' }
    })

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(maxConcurrent).toBeLessThanOrEqual(1)
  })

  it('returns zero counts without launching a browser when no active venues exist', async () => {
    const { chromium } = await import('playwright')
    mockDbChain.where.mockResolvedValue([])
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
    expect(vi.mocked(chromium.launch)).not.toHaveBeenCalled()
  })

  it('calls runPricePipeline for unpriced events after each successful crawl', async () => {
    const mockEvents = [
      {
        id: 'evt-1',
        venueId: 'venue-1',
        artist: 'Band A',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-01',
        ticketUrl: 'https://tickets.example.com/1',
      },
    ]
    // First where() resolves venues; subsequent calls resolve unpriced events per venue
    mockDbChain.where
      .mockResolvedValueOnce(mockVenues)
      .mockResolvedValue(mockEvents)

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    // 4 venues × 1 event each = 4 pipeline calls
    expect(mockRunPricePipeline).toHaveBeenCalledTimes(4)
    expect(mockRunPricePipeline).toHaveBeenCalledWith({
      eventId: 'evt-1',
      venueId: 'venue-1',
      artist: 'Band A',
      supportingArtists: null,
      tourName: null,
      date: '2026-06-01',
      ticketUrl: 'https://tickets.example.com/1',
      priceUrl: null,
    })
  })

  it('does not fail the daily crawl when runPricePipeline throws', async () => {
    mockDbChain.where.mockResolvedValueOnce(mockVenues).mockResolvedValue([
      {
        id: 'evt-1',
        venueId: 'venue-1',
        artist: 'Band A',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-01',
        ticketUrl: null,
      },
    ])
    mockRunPricePipeline.mockRejectedValue(new Error('price fetch failed'))

    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()

    expect(result.succeeded).toBe(4)
    expect(result.failed).toBe(0)
  })

  it('skips price pipeline when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'failed' })
    mockDbChain.where.mockResolvedValueOnce(mockVenues).mockResolvedValue([
      {
        id: 'evt-1',
        venueId: 'venue-1',
        artist: 'Band A',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-01',
        ticketUrl: null,
      },
    ])

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockRunPricePipeline).not.toHaveBeenCalled()
  })

  it('skips price pipeline for venues that failed to crawl', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    mockDbChain.where.mockResolvedValueOnce(mockVenues).mockResolvedValue([
      {
        id: 'evt-1',
        venueId: 'venue-2',
        artist: 'Band A',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-01',
        ticketUrl: null,
      },
    ])

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    // venue-1 failed (batch 1 of 3), venues 2+3+4 succeeded = 3 price pipeline runs
    expect(mockRunPricePipeline).toHaveBeenCalledTimes(3)
  })

  it('runs the spotify fan-out with each crawl’s inserted event ids (#763)', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockRunArtistFanoutSafely).toHaveBeenCalledTimes(4)
    expect(mockRunArtistFanoutSafely).toHaveBeenCalledWith([
      'evt-new-1',
      'evt-new-2',
      'evt-new-3',
    ])
  })

  it('skips the spotify fan-out for failed crawls (#763)', async () => {
    mockCrawlVenue.mockResolvedValue({
      id: 'run-uuid-1',
      status: 'failed',
      insertedEventIds: [],
    })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockRunArtistFanoutSafely).not.toHaveBeenCalled()
  })

  it('daily crawl counts are unaffected when the fan-out reports a run-level failure (#763)', async () => {
    // null = runArtistFanoutSafely swallowed a run-level error internally.
    mockRunArtistFanoutSafely.mockResolvedValue(null)
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()

    expect(result.succeeded).toBe(4)
    expect(result.failed).toBe(0)
  })

  it('calls Sentry.captureException when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValueOnce({
      id: 'run-uuid-1',
      status: 'failed',
      errorMessage: 'Timeout 30000ms exceeded',
    })

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Timeout 30000ms exceeded' }),
      expect.objectContaining({
        // Grouped by cause, not by this call site.
        fingerprint: ['crawl.failed', 'key:Timeout 30000ms exceeded'],
        tags: { crawl_error_kind: 'other' },
        extra: expect.objectContaining({ venueId: 'venue-1' }),
      }),
    )
  })

  it('calls Sentry.captureException when crawlVenue rejects', async () => {
    const crawlError = new Error('blocked')
    mockCrawlVenue.mockRejectedValueOnce(crawlError)

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      crawlError,
      expect.objectContaining({
        extra: expect.objectContaining({ venueId: 'venue-1' }),
      }),
    )
  })

  it('does not call Sentry.captureException for successful crawls', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryCaptureException).not.toHaveBeenCalled()
  })

  it('runs the stale event sweep once after the crawl (#675)', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSweepStaleEvents).toHaveBeenCalledTimes(1)
  })

  it('reports a failing sweep without failing the crawl (#675)', async () => {
    const sweepError = new Error('sweep exploded')
    mockSweepStaleEvents.mockRejectedValueOnce(sweepError)

    const { runDailyCrawl } = await import('./run.js')
    // The sweep only tidies rows the crawl already wrote, so its failure must
    // never take down an otherwise successful crawl.
    await expect(runDailyCrawl()).resolves.not.toThrow()

    expect(mockSentryCaptureException).toHaveBeenCalledWith(sweepError)
  })

  it('calls Sentry.logger.info with crawl result attributes after a successful crawl', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryLoggerInfo).toHaveBeenCalledWith(
      'crawl.complete',
      expect.objectContaining({
        venue_id: 'venue-1',
        status: 'success',
        events_found: 5,
        events_inserted: 3,
        duration_ms: 1200,
        extraction_strategy: 'structured_data',
      }),
    )
  })

  it('calls Sentry.logger.warn with error details when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValueOnce({
      id: 'run-uuid-1',
      status: 'failed',
      eventsFound: 0,
      durationMs: 500,
      errorMessage: 'Timeout 30000ms exceeded',
    })

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryLoggerWarn).toHaveBeenCalledWith(
      'crawl.failed',
      expect.objectContaining({
        venue_id: 'venue-1',
        status: 'failed',
        error_message: 'Timeout 30000ms exceeded',
        duration_ms: 500,
      }),
    )
  })

  it('calls Sentry.logger.error when crawlVenue throws', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    expect(mockSentryLoggerError).toHaveBeenCalledWith(
      'crawl.error',
      expect.objectContaining({
        venue_id: 'venue-1',
        error: 'Error: blocked',
      }),
    )
  })

  it('hands one outcome per venue, in order, to the run-health check', async () => {
    mockCrawlVenue
      .mockResolvedValueOnce({
        ...SUCCESSFUL_CRAWL_RUN,
        status: 'failed',
        errorMessage: 'quota',
      })
      .mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
    const { runDailyCrawl } = await import('./run.js')

    await runDailyCrawl()

    expect(mockEvaluateRunHealth).toHaveBeenCalledWith(
      mockVenues.map((venue, i) =>
        expect.objectContaining({
          venueId: venue.id,
          errorMessage: i === 0 ? 'quota' : null,
        }),
      ),
    )
  })

  it('returns degraded when the check finds a degradation', async () => {
    mockEvaluateRunHealth.mockReturnValueOnce([
      { kind: 'failure_rate', failed: 4, total: 4 },
    ])
    const { runDailyCrawl } = await import('./run.js')

    const result = await runDailyCrawl()

    expect(mockReportRunHealth).toHaveBeenCalledTimes(1)
    expect(result.degraded).toBe(true)
  })

  it('never lets the run-health report break the crawl', async () => {
    mockEvaluateRunHealth.mockReturnValueOnce([
      { kind: 'failure_rate', failed: 4, total: 4 },
    ])
    mockReportRunHealth.mockRejectedValueOnce(new Error('resend down'))
    const { runDailyCrawl } = await import('./run.js')

    await expect(runDailyCrawl()).resolves.toMatchObject({ degraded: true })
  })
})

describe('runTriggeredCrawls', () => {
  const mockTriggers = [
    { id: 'trigger-1', venueId: 'venue-a', force: false },
    { id: 'trigger-2', venueId: 'venue-b', force: false },
  ]

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // returning() call order: (1) the stale-'processing' reap, (2) the claim,
    // (3+) per-trigger status updates.
    mockDbUpdate.returning
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockTriggers)
      .mockResolvedValue([])
    mockDbChain.update.mockReturnValue(mockDbUpdate)
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.leftJoin.mockReturnThis()
    mockDbChain.where.mockResolvedValue([])
    mockCrawlVenue.mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
    mockBrowser.close.mockResolvedValue(undefined)
    mockRunPricePipeline.mockResolvedValue(undefined)
    mockRunArtistFanoutSafely.mockResolvedValue(null)
    mockSentryCaptureException.mockReset()
    mockSentryLoggerInfo.mockReset()
    mockSentryLoggerWarn.mockReset()
    mockSentryLoggerError.mockReset()
  })

  it('returns processed: 0 without launching a browser when no pending triggers exist', async () => {
    const { chromium } = await import('playwright')
    mockDbUpdate.returning.mockReset()
    mockDbUpdate.returning.mockResolvedValue([])
    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()
    expect(result.processed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
    expect(vi.mocked(chromium.launch)).not.toHaveBeenCalled()
  })

  describe('stale processing reaper (#1353)', () => {
    it('reports every trigger stranded in processing by a killed run', async () => {
      const stranded = [
        { id: 'trigger-dead-1', venueId: 'venue-x' },
        { id: 'trigger-dead-2', venueId: 'venue-y' },
      ]
      mockDbUpdate.returning.mockReset()
      mockDbUpdate.returning
        .mockResolvedValueOnce(stranded)
        .mockResolvedValueOnce([])
        .mockResolvedValue([])

      const { runTriggeredCrawls } = await import('./run.js')
      await runTriggeredCrawls()

      // An OOM SIGKILL writes no crawl_runs row and cannot be caught
      // in-process, so this reap is the only place the death is reported.
      expect(mockSentryCaptureException).toHaveBeenCalledTimes(2)
      expect(mockSentryLoggerError).toHaveBeenCalledWith(
        'crawl.trigger_stranded',
        { trigger_id: 'trigger-dead-1', venue_id: 'venue-x' },
      )
      expect(mockSentryLoggerError).toHaveBeenCalledWith(
        'crawl.trigger_stranded',
        { trigger_id: 'trigger-dead-2', venue_id: 'venue-y' },
      )
    })

    it('reports nothing when no trigger is stale', async () => {
      const { runTriggeredCrawls } = await import('./run.js')
      await runTriggeredCrawls()
      expect(mockSentryLoggerError).not.toHaveBeenCalledWith(
        'crawl.trigger_stranded',
        expect.anything(),
      )
    })

    it('reaps before claiming so a crash surfaces on the next run', async () => {
      const { runTriggeredCrawls } = await import('./run.js')
      await runTriggeredCrawls()
      const statuses = mockDbUpdate.set.mock.calls.map(
        (call) => call[0]?.status,
      )
      expect(statuses[0]).toBe('failed')
      expect(statuses[1]).toBe('processing')
    })
  })

  it('calls crawlVenue for each claimed trigger, passing a shared lazy browser provider', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(2)
    expect(mockCrawlVenue).toHaveBeenCalledWith(
      'venue-a',
      expect.any(Function),
      undefined,
      expect.any(Array),
      false,
    )
    expect(mockCrawlVenue).toHaveBeenCalledWith(
      'venue-b',
      expect.any(Function),
      undefined,
      expect.any(Array),
      false,
    )
    // Every trigger shares one provider, so at most one Chromium per run.
    const providers = new Set(mockCrawlVenue.mock.calls.map((call) => call[1]))
    expect(providers.size).toBe(1)
  })

  it('never launches Chromium when no crawl asks for a browser', async () => {
    const { chromium } = await import('playwright')
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(vi.mocked(chromium.launch)).not.toHaveBeenCalled()
    expect(mockBrowser.close).not.toHaveBeenCalled()
  })

  it('launches Chromium at most once and closes it when a crawl requests one', async () => {
    const { chromium } = await import('playwright')
    mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
      await getBrowser()
      return SUCCESSFUL_CRAWL_RUN
    })
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(vi.mocked(chromium.launch)).toHaveBeenCalledTimes(1)
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when a crawl throws after launching one', async () => {
    mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
      await getBrowser()
      throw new Error('blocked')
    })
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('surfaces a launch failure per trigger instead of aborting the batch', async () => {
    const { chromium } = await import('playwright')
    vi.mocked(chromium.launch).mockRejectedValue(new Error('no browser'))
    mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
      await getBrowser()
      return SUCCESSFUL_CRAWL_RUN
    })
    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()
    // The batch is still claimed and reported; the launch error surfaces
    // per-trigger rather than aborting every pending trigger up front.
    expect(result.processed).toBe(2)
    expect(mockSentryCaptureException).toHaveBeenCalled()
  })

  it('returns processed count equal to number of claimed triggers', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()
    expect(result.processed).toBe(2)
  })

  describe('draining the queue', () => {
    const queue = [
      { id: 'trigger-1', venueId: 'venue-a', force: false },
      { id: 'trigger-2', venueId: 'venue-b', force: false },
      { id: 'trigger-3', venueId: 'venue-c', force: false },
    ]

    // returning() order: the reap, then one claim per loop iteration. Each
    // claim hands back one trigger until the queue is empty.
    function queueClaims(): void {
      mockDbUpdate.returning.mockReset()
      mockDbUpdate.returning.mockResolvedValueOnce([])
      for (const trigger of queue) {
        mockDbUpdate.returning.mockResolvedValueOnce([trigger])
      }
      mockDbUpdate.returning.mockResolvedValue([])
    }

    function claimCount(): number {
      return mockDbUpdate.set.mock.calls.filter(
        (call) => call[0]?.status === 'processing',
      ).length
    }

    afterEach(() => {
      vi.unstubAllEnvs()
      // A test that stops before the queue empties leaves claims queued, and
      // clearAllMocks keeps queued once-values: they would leak into the next
      // test's reap and claim.
      mockDbUpdate.returning.mockReset()
      mockDbUpdate.returning.mockResolvedValue([])
    })

    it('claims one trigger per run by default, as the Render cron always has', async () => {
      queueClaims()
      const { runTriggeredCrawls } = await import('./run.js')
      const result = await runTriggeredCrawls()
      expect(result.processed).toBe(1)
      expect(claimCount()).toBe(1)
      expect(mockCrawlVenue).toHaveBeenCalledTimes(1)
    })

    it('drains until the queue is empty', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      queueClaims()
      const { runTriggeredCrawls } = await import('./run.js')
      const result = await runTriggeredCrawls()
      expect(result.processed).toBe(3)
      // Three claims that found a trigger, then one that found none.
      expect(claimCount()).toBe(4)
      expect(mockCrawlVenue.mock.calls.map((call) => call[0])).toEqual([
        'venue-a',
        'venue-b',
        'venue-c',
      ])
    })

    it('stops at CRAWL_TRIGGER_DRAIN_MAX and leaves the rest pending', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '2')
      queueClaims()
      const { runTriggeredCrawls } = await import('./run.js')
      const result = await runTriggeredCrawls()
      expect(result.processed).toBe(2)
      expect(claimCount()).toBe(2)
      expect(mockCrawlVenue).toHaveBeenCalledTimes(2)
    })

    it('stops claiming once the time budget is spent', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      vi.stubEnv('CRAWL_TRIGGER_BUDGET_MS', '1000')
      queueClaims()
      const start = Date.now()
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(start)
      mockCrawlVenue.mockImplementation(async () => {
        // Each crawl moves the clock past the whole budget.
        nowSpy.mockReturnValue(Date.now() + 5000)
        return SUCCESSFUL_CRAWL_RUN
      })
      try {
        const { runTriggeredCrawls } = await import('./run.js')
        const result = await runTriggeredCrawls()
        // The first trigger always runs; no further claim after the budget.
        expect(result.processed).toBe(1)
        expect(claimCount()).toBe(1)
      } finally {
        nowSpy.mockRestore()
      }
    })

    it('keeps draining after one trigger fails', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      queueClaims()
      mockCrawlVenue
        .mockRejectedValueOnce(new Error('venue down'))
        .mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
      const { runTriggeredCrawls } = await import('./run.js')
      const result = await runTriggeredCrawls()
      expect(result.processed).toBe(3)
      const finalStatuses = mockDbUpdate.set.mock.calls
        .map((call) => call[0]?.status)
        .filter((status) => status === 'failed' || status === 'done')
      // The reap's 'failed' write comes first, then one outcome per trigger.
      expect(finalStatuses).toEqual(['failed', 'failed', 'done', 'done'])
    })

    it('shares one browser across every trigger in the drain', async () => {
      const { chromium } = await import('playwright')
      // An earlier test leaves launch rejecting; clearAllMocks keeps that.
      vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      queueClaims()
      mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
        await getBrowser()
        return SUCCESSFUL_CRAWL_RUN
      })
      const { runTriggeredCrawls } = await import('./run.js')
      await runTriggeredCrawls()
      expect(vi.mocked(chromium.launch)).toHaveBeenCalledTimes(1)
      expect(mockBrowser.close).toHaveBeenCalledTimes(1)
    })

    it('relaunches Chromium when the shared browser dies mid-drain', async () => {
      const { chromium } = await import('playwright')
      vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as never)
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      queueClaims()
      let crawls = 0
      mockCrawlVenue.mockImplementation(async (_venueId, getBrowser) => {
        await getBrowser()
        crawls += 1
        if (crawls === 1) {
          // Chromium crashes after the first venue.
          const onDisconnected = mockBrowser.on.mock.calls.find(
            ([event]) => event === 'disconnected',
          )?.[1] as (() => void) | undefined
          onDisconnected?.()
        }
        return SUCCESSFUL_CRAWL_RUN
      })
      const { runTriggeredCrawls } = await import('./run.js')
      await runTriggeredCrawls()
      expect(vi.mocked(chromium.launch)).toHaveBeenCalledTimes(2)
    })

    it('carries on when marking a thrown trigger failed also fails', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', '50')
      queueClaims()
      mockCrawlVenue
        .mockRejectedValueOnce(new Error('venue down'))
        .mockResolvedValue(SUCCESSFUL_CRAWL_RUN)
      mockDbUpdate.where.mockImplementation(() => {
        const status = mockDbUpdate.set.mock.lastCall?.[0]?.status
        // Only the catch path's 'failed' write after a crawl throws rejects;
        // the reap's 'failed' write goes through returning().
        const isCatchWrite =
          status === 'failed' && mockCrawlVenue.mock.calls.length === 1
        return isCatchWrite
          ? Promise.reject(new Error('db down'))
          : mockDbUpdate
      })
      try {
        const { runTriggeredCrawls } = await import('./run.js')
        const result = await runTriggeredCrawls()
        expect(result.processed).toBe(3)
        expect(mockCrawlVenue).toHaveBeenCalledTimes(3)
      } finally {
        mockDbUpdate.where.mockReset()
        mockDbUpdate.where.mockReturnThis()
      }
    })

    it('ignores an invalid drain setting and keeps the default', async () => {
      vi.stubEnv('CRAWL_TRIGGER_DRAIN_MAX', 'lots')
      queueClaims()
      const { runTriggeredCrawls } = await import('./run.js')
      const result = await runTriggeredCrawls()
      expect(result.processed).toBe(1)
    })
  })

  it('calls runPricePipeline for unpriced events after each triggered crawl', async () => {
    const mockEvents = [
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-15',
        ticketUrl: null,
      },
    ]
    mockDbChain.where.mockResolvedValue(mockEvents)

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    // 2 triggers × 1 event each = 2 pipeline calls
    expect(mockRunPricePipeline).toHaveBeenCalledTimes(2)
    expect(mockRunPricePipeline).toHaveBeenCalledWith({
      eventId: 'evt-a',
      venueId: 'venue-a',
      artist: 'Artist X',
      supportingArtists: null,
      tourName: null,
      date: '2026-06-15',
      ticketUrl: null,
      priceUrl: null,
    })
  })

  it('skips price pipeline when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'failed' })
    mockDbChain.where.mockResolvedValue([
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-15',
        ticketUrl: null,
      },
    ])

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockRunPricePipeline).not.toHaveBeenCalled()
  })

  // A paused venue's pages are not fetched for prices either. The triggered
  // path runs prices after any run that did not fail, and a pause records a
  // skipped run, so the price query itself has to exclude paused venues.
  it('excludes paused venues from the triggered price query', async () => {
    const { isNull } = await import('drizzle-orm')
    mockDbChain.where.mockResolvedValue([])
    vi.mocked(isNull).mockClear()

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(vi.mocked(isNull)).toHaveBeenCalledWith('crawlPausedAt')
  })

  it('stops a price batch when the venue is paused part-way through', async () => {
    const unpriced = {
      venueId: 'venue-a',
      artist: 'Artist X',
      supportingArtists: null,
      tourName: null,
      date: '2026-06-15',
      ticketUrl: null,
    }
    // Answer each query by what it selected, not by call order: the price
    // batch selects priceUrl, the pause re-check selects only crawlPausedAt.
    const pauseChecks: (Date | null)[] = [null, new Date()]
    mockDbChain.where.mockImplementation(() => {
      const fields: unknown = mockDbChain.select.mock.lastCall?.[0]
      if (fields && typeof fields === 'object' && 'priceUrl' in fields) {
        return Promise.resolve([
          { id: 'evt-1', ...unpriced },
          { id: 'evt-2', ...unpriced },
        ])
      }
      if (fields && typeof fields === 'object' && 'crawlPausedAt' in fields) {
        // Not paused before evt-1; paused by the time evt-2 is reached.
        const crawlPausedAt =
          pauseChecks.length > 0 ? pauseChecks.shift() : new Date()
        return Promise.resolve([{ crawlPausedAt }])
      }
      return Promise.resolve([])
    })

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    const priced = mockRunPricePipeline.mock.calls.map(
      ([input]) => input.eventId,
    )
    expect(priced).toContain('evt-1')
    expect(priced).not.toContain('evt-2')
  })

  it('does not fail triggered crawl when runPricePipeline throws', async () => {
    mockDbChain.where.mockResolvedValue([
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
        supportingArtists: null,
        tourName: null,
        date: '2026-06-15',
        ticketUrl: null,
      },
    ])
    mockRunPricePipeline.mockRejectedValue(new Error('price fetch failed'))

    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()

    expect(result.processed).toBe(2)
  })

  it('runs the spotify fan-out with each trigger’s inserted event ids (#763)', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockRunArtistFanoutSafely).toHaveBeenCalledTimes(2)
    expect(mockRunArtistFanoutSafely).toHaveBeenCalledWith([
      'evt-new-1',
      'evt-new-2',
      'evt-new-3',
    ])
  })

  it('skips the spotify fan-out for failed triggered crawls (#763)', async () => {
    mockCrawlVenue.mockResolvedValue({
      id: 'run-uuid-1',
      status: 'failed',
      insertedEventIds: [],
    })
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockRunArtistFanoutSafely).not.toHaveBeenCalled()
  })

  it('calls Sentry.captureException when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValueOnce({
      id: 'run-uuid-1',
      status: 'failed',
      errorMessage: 'Timeout 30000ms exceeded',
    })

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Timeout 30000ms exceeded' }),
      expect.objectContaining({
        // Grouped by cause, not by this call site.
        fingerprint: ['crawl.failed', 'key:Timeout 30000ms exceeded'],
        tags: { crawl_error_kind: 'other' },
        extra: expect.objectContaining({
          venueId: 'venue-a',
          triggerId: 'trigger-1',
        }),
      }),
    )
  })

  it('calls Sentry.captureException when crawlVenue throws unexpectedly', async () => {
    const crawlError = new Error('blocked')
    mockCrawlVenue.mockRejectedValueOnce(crawlError)

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryCaptureException).toHaveBeenCalledWith(
      crawlError,
      expect.objectContaining({
        extra: expect.objectContaining({
          triggerId: 'trigger-1',
          venueId: 'venue-a',
        }),
      }),
    )
  })

  it('does not call Sentry.captureException for successful crawls', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryCaptureException).not.toHaveBeenCalled()
  })

  it('calls Sentry.logger.info with crawl result attributes after a successful triggered crawl', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryLoggerInfo).toHaveBeenCalledWith(
      'crawl.complete',
      expect.objectContaining({
        venue_id: 'venue-a',
        status: 'success',
        events_found: 5,
        events_inserted: 3,
        duration_ms: 1200,
        extraction_strategy: 'structured_data',
      }),
    )
  })

  it('calls Sentry.logger.warn when triggered crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValueOnce({
      id: 'run-uuid-1',
      status: 'failed',
      eventsFound: 0,
      durationMs: 300,
      errorMessage: 'HTTP 403 Forbidden',
    })

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryLoggerWarn).toHaveBeenCalledWith(
      'crawl.failed',
      expect.objectContaining({
        venue_id: 'venue-a',
        status: 'failed',
        error_message: 'HTTP 403 Forbidden',
        duration_ms: 300,
      }),
    )
  })

  it('calls Sentry.logger.error when triggered crawlVenue throws', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('network timeout'))

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockSentryLoggerError).toHaveBeenCalledWith(
      'crawl.error',
      expect.objectContaining({
        venue_id: 'venue-a',
        error: 'Error: network timeout',
      }),
    )
  })
})
