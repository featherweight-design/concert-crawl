import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB
const mockVenues = [
  { id: 'venue-1', name: 'Ogden Theatre' },
  { id: 'venue-2', name: 'Bluebird Theater' },
  { id: 'venue-3', name: 'Red Rocks' },
  { id: 'venue-4', name: 'Mission Ballroom' },
]

const mockDbChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(mockVenues),
}
vi.mock('@concert-crawl/db', () => ({
  db: mockDbChain,
  venues: { id: 'id', name: 'name', active: 'active', verified: 'verified' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
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
    mockCrawlVenue.mockResolvedValue({ id: 'run-uuid-1', status: 'success' })
    mockBrowser.close.mockResolvedValue(undefined)
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

  it('returns zero counts when no active venues exist', async () => {
    mockDbChain.where.mockResolvedValue([])
    const { runDailyCrawl } = await import('./run.js')
    const result = await runDailyCrawl()
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockCrawlVenue).not.toHaveBeenCalled()
  })
})
