// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { CrawlRun, CrawlTrigger } from '@concert-crawl/types'

const mockTriggerVenueCrawl = vi.fn()
const mockFetchCrawlTrigger = vi.fn()
const mockFetchCrawlRun = vi.fn()

vi.mock('./lib/crawl', () => ({
  triggerVenueCrawl: (...args: unknown[]) => mockTriggerVenueCrawl(...args),
  fetchCrawlTrigger: (...args: unknown[]) => mockFetchCrawlTrigger(...args),
  fetchCrawlRun: (...args: unknown[]) => mockFetchCrawlRun(...args),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { CrawlTriggerButton } from './CrawlTriggerButton'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const TRIGGER_ID = '22222222-2222-2222-2222-222222222222'
const RUN_ID = '33333333-3333-3333-3333-333333333333'

const makeTrigger = (over: Partial<CrawlTrigger>): CrawlTrigger => ({
  id: TRIGGER_ID,
  venueId: VENUE_ID,
  status: 'pending',
  crawlRunId: null,
  triggeredBy: null,
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
  ...over,
})

const makeRun = (over: Partial<CrawlRun>): CrawlRun => ({
  id: RUN_ID,
  venueId: VENUE_ID,
  status: 'success',
  httpStatusCode: 200,
  robotsTxtBlocked: null,
  extractionStrategyUsed: 'platform:venuepilot',
  eventsFound: 34,
  eventsInserted: 34,
  eventsUpdated: 0,
  errorMessage: null,
  durationMs: 1200,
  createdAt: '2026-07-17T00:00:00.000Z',
  ...over,
})

describe('CrawlTriggerButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockTriggerVenueCrawl.mockReset()
    mockFetchCrawlTrigger.mockReset()
    mockFetchCrawlRun.mockReset()
    mockRefresh.mockReset()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    cleanup()
  })

  it('polls the trigger, then fetches the linked run (never /runs/undefined)', async () => {
    mockTriggerVenueCrawl.mockResolvedValue({ triggerId: TRIGGER_ID })
    mockFetchCrawlTrigger
      .mockResolvedValueOnce(makeTrigger({ status: 'processing' }))
      .mockResolvedValueOnce(
        makeTrigger({ status: 'done', crawlRunId: RUN_ID }),
      )
    mockFetchCrawlRun.mockResolvedValue(makeRun({}))

    render(<CrawlTriggerButton venueId={VENUE_ID} />)
    fireEvent.click(screen.getByText(ADMIN_COPY.crawlTriggerButton.button.idle))

    // triggerVenueCrawl resolves, poll interval starts
    await vi.waitFor(() =>
      expect(mockTriggerVenueCrawl).toHaveBeenCalledWith(
        VENUE_ID,
        'test-token',
      ),
    )

    // First poll: still processing → no run fetch yet
    await vi.advanceTimersByTimeAsync(2000)
    // Second poll: done → fetch the linked run
    await vi.advanceTimersByTimeAsync(2000)

    await vi.waitFor(() =>
      expect(mockFetchCrawlRun).toHaveBeenCalledWith(RUN_ID, 'test-token'),
    )
    // The regression: the run must be fetched by the trigger's crawlRunId,
    // never by an undefined id.
    expect(mockFetchCrawlRun).not.toHaveBeenCalledWith(undefined, 'test-token')
  })

  it('shows an error when the trigger fails without producing a run', async () => {
    mockTriggerVenueCrawl.mockResolvedValue({ triggerId: TRIGGER_ID })
    mockFetchCrawlTrigger.mockResolvedValue(
      makeTrigger({ status: 'failed', crawlRunId: null }),
    )

    render(<CrawlTriggerButton venueId={VENUE_ID} />)
    fireEvent.click(screen.getByText(ADMIN_COPY.crawlTriggerButton.button.idle))

    await vi.waitFor(() => expect(mockTriggerVenueCrawl).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(2000)

    await vi.waitFor(() =>
      expect(
        screen.getByText(ADMIN_COPY.crawlTriggerButton.errors.crawlFailed),
      ).toBeTruthy(),
    )
    expect(mockFetchCrawlRun).not.toHaveBeenCalled()
  })
})
