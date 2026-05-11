import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Sentry
const mockSentryCaptureException = vi.fn()
vi.mock('@sentry/node', () => ({
  captureException: mockSentryCaptureException,
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
  where: vi.fn().mockResolvedValue(mockVenues),
  update: vi.fn().mockReturnValue(mockDbUpdate),
}
vi.mock('@concert-crawl/db', () => ({
  db: mockDbChain,
  venues: { id: 'id', name: 'name', active: 'active', verified: 'verified' },
  crawlTriggers: { id: 'id', venueId: 'venueId', status: 'status' },
  events: {
    id: 'id',
    venueId: 'venueId',
    artist: 'artist',
    date: 'date',
    ticketUrl: 'ticketUrl',
    ticketPriceMin: 'ticketPriceMin',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
}))

// Mock price pipeline
const mockRunPricePipeline = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/price-pipeline', () => ({
  runPricePipeline: mockRunPricePipeline,
}))

// Mock Playwright — return a minimal browser-shaped object
const mockBrowser = { close: vi.fn().mockResolvedValue(undefined) }
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}))

// Mock crawlVenue and tagEventsWithGenres
const mockCrawlVenue = vi
  .fn()
  .mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
const mockTagEventsWithGenres = vi.fn().mockResolvedValue(undefined)
vi.mock('@concert-crawl/crawler-core', () => ({
  crawlVenue: mockCrawlVenue,
  tagEventsWithGenres: mockTagEventsWithGenres,
}))

// Mock logger
vi.mock('@concert-crawl/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

describe('runDailyCrawl', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.where.mockResolvedValue(mockVenues)
    mockDbChain.update.mockReturnValue(mockDbUpdate)
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    mockBrowser.close.mockResolvedValue(undefined)
    mockRunPricePipeline.mockResolvedValue(undefined)
    mockSentryCaptureException.mockReset()
  })

  it('calls crawlVenue for each active venue, passing the shared browser', async () => {
    const { chromium } = await import('playwright')
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    const browser = await vi.mocked(chromium.launch).mock.results[0]?.value
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-1', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-2', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-3', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-4', browser)
  })

  it('closes the browser after all crawls complete', async () => {
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when a crawl throws', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
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
      .mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()
    expect(mockCrawlVenue).toHaveBeenCalledTimes(4)
  })

  it('processes no more than 3 venues concurrently per batch', async () => {
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
    expect(maxConcurrent).toBeLessThanOrEqual(3)
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
      date: '2026-06-01',
      ticketUrl: 'https://tickets.example.com/1',
    })
  })

  it('does not fail the daily crawl when runPricePipeline throws', async () => {
    mockDbChain.where.mockResolvedValueOnce(mockVenues).mockResolvedValue([
      {
        id: 'evt-1',
        venueId: 'venue-1',
        artist: 'Band A',
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
        date: '2026-06-01',
        ticketUrl: null,
      },
    ])

    const { runDailyCrawl } = await import('./run.js')
    await runDailyCrawl()

    // venue-1 failed (batch 1 of 3), venues 2+3+4 succeeded = 3 price pipeline runs
    expect(mockRunPricePipeline).toHaveBeenCalledTimes(3)
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
})

describe('runTriggeredCrawls', () => {
  const mockTriggers = [
    { id: 'trigger-1', venueId: 'venue-a' },
    { id: 'trigger-2', venueId: 'venue-b' },
  ]

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // First returning() claims triggers; subsequent calls handle per-trigger status updates
    mockDbUpdate.returning
      .mockResolvedValueOnce(mockTriggers)
      .mockResolvedValue([])
    mockDbChain.update.mockReturnValue(mockDbUpdate)
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.where.mockResolvedValue([])
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    mockBrowser.close.mockResolvedValue(undefined)
    mockRunPricePipeline.mockResolvedValue(undefined)
    mockSentryCaptureException.mockReset()
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

  it('calls crawlVenue for each claimed trigger, passing the shared browser', async () => {
    const { chromium } = await import('playwright')
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    const browser = await vi.mocked(chromium.launch).mock.results[0]?.value
    expect(mockCrawlVenue).toHaveBeenCalledTimes(2)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-a', browser)
    expect(mockCrawlVenue).toHaveBeenCalledWith('venue-b', browser)
  })

  it('closes the browser after all triggers are processed', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('closes the browser even when a crawl throws', async () => {
    mockCrawlVenue.mockRejectedValueOnce(new Error('blocked'))
    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()
    expect(mockBrowser.close).toHaveBeenCalledTimes(1)
  })

  it('marks all triggers failed and returns processed: 0 when browser launch fails', async () => {
    const { chromium } = await import('playwright')
    vi.mocked(chromium.launch).mockRejectedValueOnce(new Error('no browser'))
    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()
    expect(result.processed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
    expect(mockBrowser.close).not.toHaveBeenCalled()
  })

  it('returns processed count equal to number of claimed triggers', async () => {
    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()
    expect(result.processed).toBe(2)
  })

  it('calls runPricePipeline for unpriced events after each triggered crawl', async () => {
    const mockEvents = [
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
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
      date: '2026-06-15',
      ticketUrl: null,
    })
  })

  it('skips price pipeline when crawlVenue resolves with status: failed', async () => {
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'failed' })
    mockDbChain.where.mockResolvedValue([
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
        date: '2026-06-15',
        ticketUrl: null,
      },
    ])

    const { runTriggeredCrawls } = await import('./run.js')
    await runTriggeredCrawls()

    expect(mockRunPricePipeline).not.toHaveBeenCalled()
  })

  it('does not fail triggered crawl when runPricePipeline throws', async () => {
    mockDbChain.where.mockResolvedValue([
      {
        id: 'evt-a',
        venueId: 'venue-a',
        artist: 'Artist X',
        date: '2026-06-15',
        ticketUrl: null,
      },
    ])
    mockRunPricePipeline.mockRejectedValue(new Error('price fetch failed'))

    const { runTriggeredCrawls } = await import('./run.js')
    const result = await runTriggeredCrawls()

    expect(result.processed).toBe(2)
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
})
