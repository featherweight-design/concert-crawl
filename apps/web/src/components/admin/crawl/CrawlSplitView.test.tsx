// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CrawlRun } from '@concert-crawl/types'

vi.mock('@/lib/queries/use-admin-venue-runs', () => ({
  useAdminVenueRuns: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/lib/queries/use-admin-crawl-trigger', () => ({
  useTriggerVenueCrawl: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { CrawlSplitView } from './CrawlSplitView'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const makeStatusRow = () => ({
  venueId: VENUE_ID,
  venueName: 'Bluebird Theater',
  websiteUrl: 'https://example.com',
  status: 'failed',
  lastRunStatus: 'failed',
  lastRunAt: '2026-07-30T00:00:00.000Z',
  eventsFound: 0,
  eventsInserted: 0,
  eventsUpdated: 0,
  llmCostUsd: null,
  durationMs: null,
  httpStatusCode: 500,
  consecutiveFailures: 3,
  blockedAt: null,
  strategy: 'llm',
  error: 'boom',
})

const activeTabLabel = (): string | undefined =>
  Array.from(document.querySelectorAll('button'))
    .find((btn) => btn.style.borderBottom.includes('var(--signal)'))
    ?.textContent?.trim()

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CrawlSplitView inspector tab', () => {
  // Regression guard for #1267. `initialStatus` is a server prop, so every
  // `router.refresh()` — triggering a crawl, for instance — hands back a new
  // array identity. Keying the tab-defaulting effect on that array reset a
  // deep-linked tab back to the default on each refresh.
  it('keeps a deep-linked tab when a refresh hands back a new initialStatus identity', () => {
    const runs: CrawlRun[] = []
    const { rerender } = render(
      <CrawlSplitView
        initialStatus={[makeStatusRow()]}
        initialRuns={runs}
        initialSelectedId={VENUE_ID}
        initialTab="history"
      />,
    )

    expect(activeTabLabel()).toBe(ADMIN_COPY.crawl.inspectorTabs.history)

    // Same data, fresh array — exactly what a server re-render produces.
    rerender(
      <CrawlSplitView
        initialStatus={[makeStatusRow()]}
        initialRuns={runs}
        initialSelectedId={VENUE_ID}
        initialTab="history"
      />,
    )

    expect(activeTabLabel()).toBe(ADMIN_COPY.crawl.inspectorTabs.history)
  })

  it('defaults a faulted venue to diagnostics when no tab is deep-linked', () => {
    render(
      <CrawlSplitView
        initialStatus={[makeStatusRow()]}
        initialRuns={[]}
        initialSelectedId={VENUE_ID}
      />,
    )

    expect(screen.getByText(ADMIN_COPY.crawl.inspectorTabs.diagnostics))
    expect(activeTabLabel()).toBe(ADMIN_COPY.crawl.inspectorTabs.diagnostics)
  })
})
