import { describe, it, expect } from 'vitest'
import {
  formatStrategy,
  buildPendingReviewHint,
  buildCrawlHealthHint,
  buildActiveVenuesHint,
  buildSparklineData,
  buildCostAxisLabels,
  formatChartDate,
  formatCostTooltip,
  computeWowTrend,
  toStatusRow,
} from './dashboard'
import type { CrawlStatusRow, RawVenueStatus } from './dashboard'
import type { CrawlRun, DailyCost, Event, Venue } from '@concert-crawl/types'

// --- Factories ---

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    venueId: 'venue-1',
    title: 'Test Show',
    artist: 'Test Artist',
    date: '2026-06-01',
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
    genre: null,
    status: 'upcoming',
    confidenceScore: null,
    verified: false,
    sourceUrl: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    name: 'Test Venue',
    slug: 'test-venue',
    websiteUrl: 'https://test.com',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: true,
    verifiedBy: null,
    verifiedAt: null,
    lastCrawledAt: null,
    crawlNotes: null,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'networkidle' as const,
    crawlWaitForSelector: null,
    robotsTxtAllowed: null,
    robotsTxtCheckedAt: null,
    consecutiveFailures: 0,
    blockedAt: null,
    extractionStrategy: null,
    contactEmail: null,
    priceUrl: null,
    ticketVendor: null,
    debugCaptureHtml: false,
    crawlMode: null,
    address: null,
    capacity: null,
    venueType: null,
    about: null,
    neighborhood: null,
    featured: false,
    lat: null,
    lng: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCrawlRun(overrides: Partial<CrawlRun> = {}): CrawlRun {
  return {
    id: 'run-1',
    venueId: 'venue-1',
    status: 'success',
    httpStatusCode: 200,
    robotsTxtBlocked: null,
    extractionStrategyUsed: null,
    eventsFound: 5,
    eventsInserted: 5,
    eventsUpdated: 0,
    errorMessage: null,
    durationMs: 1000,
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

function makeStatusRow(
  overrides: Partial<CrawlStatusRow> = {},
): CrawlStatusRow {
  return {
    venueId: 'venue-1',
    venueName: 'Test Venue',
    status: 'success',
    lastRunAt: '2026-05-01T00:00:00Z',
    eventsFound: 5,
    strategy: 'llm',
    cost: 0,
    error: null,
    consecutiveFailures: 0,
    blockedAt: null,
    ...overrides,
  }
}

// --- formatStrategy ---

describe('formatStrategy', () => {
  it('maps structured_data → structured', () => {
    expect(formatStrategy('structured_data')).toBe('structured')
  })
  it('maps llm → llm', () => {
    expect(formatStrategy('llm')).toBe('llm')
  })
  it('maps manual → manual', () => {
    expect(formatStrategy('manual')).toBe('manual')
  })
  it('maps null → —', () => {
    expect(formatStrategy(null)).toBe('—')
  })
  it('maps unknown string → —', () => {
    expect(formatStrategy('unknown')).toBe('—')
  })
})

// --- buildPendingReviewHint ---

describe('buildPendingReviewHint', () => {
  it('returns empty string when no events', () => {
    expect(buildPendingReviewHint([], [])).toBe('')
  })

  it('returns top-3 venues sorted by count descending', () => {
    const venues = [
      makeVenue({ id: 'v1', name: 'Bluebird' }),
      makeVenue({ id: 'v2', name: 'Gothic' }),
      makeVenue({ id: 'v3', name: 'Ogden' }),
    ]
    const events = [
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v2' }),
      makeEvent({ venueId: 'v2' }),
      makeEvent({ venueId: 'v2' }),
      makeEvent({ venueId: 'v2' }),
      makeEvent({ venueId: 'v3' }),
      makeEvent({ venueId: 'v3' }),
      makeEvent({ venueId: 'v3' }),
    ]
    expect(buildPendingReviewHint(events, venues)).toBe(
      'Bluebird (5), Gothic (4), Ogden (3)',
    )
  })

  it('caps at 3 venues even if more exist', () => {
    const venues = [
      makeVenue({ id: 'v1', name: 'A' }),
      makeVenue({ id: 'v2', name: 'B' }),
      makeVenue({ id: 'v3', name: 'C' }),
      makeVenue({ id: 'v4', name: 'D' }),
    ]
    const events = [
      makeEvent({ venueId: 'v1' }),
      makeEvent({ venueId: 'v2' }),
      makeEvent({ venueId: 'v3' }),
      makeEvent({ venueId: 'v4' }),
    ]
    const result = buildPendingReviewHint(events, venues)
    expect(result.split(', ')).toHaveLength(3)
  })
})

// --- buildCrawlHealthHint ---

describe('buildCrawlHealthHint', () => {
  it('returns empty string when all healthy', () => {
    const rows = [
      makeStatusRow(),
      makeStatusRow({ venueId: 'v2', venueName: 'Other' }),
    ]
    expect(buildCrawlHealthHint(rows)).toBe('')
  })

  it('shows blocked venue with ordinal failure count', () => {
    const rows = [
      makeStatusRow({
        venueName: 'Bluebird',
        blockedAt: '2026-05-01T00:00:00Z',
        consecutiveFailures: 4,
      }),
    ]
    expect(buildCrawlHealthHint(rows)).toBe('Bluebird blocked · 4th failure')
  })

  it('shows 1st/2nd/3rd ordinals correctly', () => {
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 1,
        }),
      ]),
    ).toContain('1st failure')
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 2,
        }),
      ]),
    ).toContain('2nd failure')
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 3,
        }),
      ]),
    ).toContain('3rd failure')
  })

  it('shows venue with most failures when none blocked', () => {
    const rows = [
      makeStatusRow({ venueName: 'Bluebird', consecutiveFailures: 2 }),
      makeStatusRow({
        venueId: 'v2',
        venueName: 'Gothic',
        consecutiveFailures: 1,
      }),
    ]
    expect(buildCrawlHealthHint(rows)).toBe('Bluebird · 2nd failure')
  })

  it('uses th for 11/12/13 (not 11st/12nd/13rd)', () => {
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 11,
        }),
      ]),
    ).toContain('11th failure')
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 12,
        }),
      ]),
    ).toContain('12th failure')
    expect(
      buildCrawlHealthHint([
        makeStatusRow({
          venueName: 'A',
          blockedAt: '2026-05-01T00:00:00Z',
          consecutiveFailures: 21,
        }),
      ]),
    ).toContain('21st failure')
  })

  it('picks worst blocked venue (highest consecutiveFailures)', () => {
    const rows = [
      makeStatusRow({
        venueName: 'Bluebird',
        blockedAt: '2026-05-01T00:00:00Z',
        consecutiveFailures: 2,
      }),
      makeStatusRow({
        venueId: 'v2',
        venueName: 'Gothic',
        blockedAt: '2026-05-01T00:00:00Z',
        consecutiveFailures: 5,
      }),
    ]
    expect(buildCrawlHealthHint(rows)).toContain('Gothic')
  })
})

// --- buildActiveVenuesHint ---

describe('buildActiveVenuesHint', () => {
  it('returns empty string when all active and none blocked', () => {
    const venues = [makeVenue()]
    expect(buildActiveVenuesHint(venues)).toBe('')
  })

  it('counts paused venues (active=false, blockedAt=null)', () => {
    const venues = [
      makeVenue({ active: false, blockedAt: null }),
      makeVenue({ id: 'v2', active: true }),
    ]
    expect(buildActiveVenuesHint(venues)).toContain('1 paused')
  })

  it('counts blocked venues (blockedAt not null)', () => {
    const venues = [makeVenue({ blockedAt: '2026-05-01T00:00:00Z' })]
    expect(buildActiveVenuesHint(venues)).toContain('1 blocked')
  })

  it('counts venues added this week', () => {
    const recentDate = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const venues = [makeVenue({ createdAt: recentDate })]
    expect(buildActiveVenuesHint(venues)).toContain('+1 this week')
  })

  it('does not count old venues as this week', () => {
    const oldDate = '2026-01-01T00:00:00Z'
    const venues = [makeVenue({ createdAt: oldDate })]
    expect(buildActiveVenuesHint(venues)).not.toContain('this week')
  })

  it('joins multiple parts with ·', () => {
    const venues = [
      makeVenue({ active: false, blockedAt: null }),
      makeVenue({ id: 'v2', blockedAt: '2026-05-01T00:00:00Z' }),
    ]
    const result = buildActiveVenuesHint(venues)
    expect(result).toContain('paused')
    expect(result).toContain('blocked')
    expect(result).toContain(' · ')
  })
})

// --- buildSparklineData ---

describe('buildSparklineData', () => {
  it('returns empty array for no runs', () => {
    expect(buildSparklineData([])).toEqual([])
  })

  it('maps success → 1, failed → 0, oldest→newest order', () => {
    const runs = [
      makeCrawlRun({ status: 'success' }), // newest
      makeCrawlRun({ status: 'failed' }),
      makeCrawlRun({ status: 'partial' }), // oldest
    ]
    // After slice(0,8).reverse(): oldest first → [partial(0), failed(0), success(1)]
    expect(buildSparklineData(runs)).toEqual([0, 0, 1])
  })

  it('counts skipped as healthy alongside success', () => {
    const runs = [
      makeCrawlRun({ status: 'skipped' }), // newest — page-hash dedup, healthy
      makeCrawlRun({ status: 'success' }),
      makeCrawlRun({ status: 'failed' }), // oldest
    ]
    // After slice(0,8).reverse(): oldest first → [failed(0), success(1), skipped(1)]
    expect(buildSparklineData(runs)).toEqual([0, 1, 1])
  })

  it('caps at 8 runs', () => {
    const runs = Array.from({ length: 12 }, () => makeCrawlRun())
    expect(buildSparklineData(runs)).toHaveLength(8)
  })
})

// --- computeWowTrend ---

// Builds a zero-filled daily series ending 2026-07-10, oldest→newest, from
// the per-day costs supplied newest-last.
function makeDays(costs: number[]): DailyCost[] {
  return costs.map((costUsd, idx) => {
    const date = new Date(Date.UTC(2026, 6, 10 - (costs.length - 1 - idx)))
    return { date: date.toISOString().slice(0, 10), costUsd }
  })
}

describe('computeWowTrend', () => {
  it('returns undefined when the prior window has no spend', () => {
    const days = makeDays([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1])
    expect(computeWowTrend(days)).toBeUndefined()
  })

  it('returns undefined for an empty series', () => {
    expect(computeWowTrend([])).toBeUndefined()
  })

  it('computes an upward trend as bad', () => {
    // prior 7 days sum 7, recent 7 days sum 14 → +100%
    const days = makeDays([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2])
    expect(computeWowTrend(days)).toEqual({
      dir: 'up',
      text: '+100%',
      good: false,
    })
  })

  it('computes a downward trend as good', () => {
    // prior 7 days sum 14, recent 7 days sum 7 → -50%
    const days = makeDays([2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1])
    expect(computeWowTrend(days)).toEqual({
      dir: 'down',
      text: '-50%',
      good: true,
    })
  })

  it('treats flat spend as good and renders an unsigned 0%', () => {
    const days = makeDays([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    const trend = computeWowTrend(days)
    expect(trend?.good).toBe(true)
    expect(trend?.dir).toBe('down')
    expect(trend?.text).toBe('0%')
  })

  it('returns undefined for a series shorter than two full weeks', () => {
    // 10 days: the prior window would be partial (3 days) and mislead
    const days = makeDays([1, 1, 1, 2, 2, 2, 2, 2, 2, 2])
    expect(computeWowTrend(days)).toBeUndefined()
  })
})

// --- buildCostAxisLabels ---

describe('buildCostAxisLabels', () => {
  it('returns empty array for empty series', () => {
    expect(buildCostAxisLabels([])).toEqual([])
  })

  it('returns a single label for a one-day series', () => {
    expect(buildCostAxisLabels([{ date: '2026-07-10', costUsd: 1 }])).toEqual([
      'JUL 10',
    ])
  })

  it('returns 5 evenly spaced labels for a 30-day series', () => {
    const days = Array.from({ length: 30 }, (unused, idx) => {
      const date = new Date(Date.UTC(2026, 5, 11 + idx))
      return { date: date.toISOString().slice(0, 10), costUsd: 0 }
    })
    const labels = buildCostAxisLabels(days)
    expect(labels).toHaveLength(5)
    expect(labels[0]).toBe('JUN 11')
    expect(labels[4]).toBe('JUL 10')
  })

  it('formats dates as uppercase month + day in UTC', () => {
    const labels = buildCostAxisLabels([{ date: '2026-01-02', costUsd: 0 }])
    expect(labels).toEqual(['JAN 2'])
  })

  it('caps label count at the series length', () => {
    const days: DailyCost[] = [
      { date: '2026-07-09', costUsd: 0 },
      { date: '2026-07-10', costUsd: 0 },
    ]
    expect(buildCostAxisLabels(days)).toEqual(['JUL 9', 'JUL 10'])
  })
})

// --- formatChartDate / formatCostTooltip ---

describe('formatChartDate', () => {
  it('formats a series date as an uppercase short label', () => {
    expect(formatChartDate('2026-07-08')).toBe('JUL 8')
  })

  it('parses at UTC midnight so the calendar day never shifts', () => {
    expect(formatChartDate('2026-12-31')).toBe('DEC 31')
  })
})

describe('formatCostTooltip', () => {
  it('joins the date label and formatted cost', () => {
    expect(formatCostTooltip({ date: '2026-07-08', costUsd: 1.5 })).toBe(
      'JUL 8 · $1.50',
    )
  })
})

// --- toStatusRow ---

describe('toStatusRow', () => {
  it('maps venue with lastRun correctly', () => {
    const raw: RawVenueStatus = {
      id: 'v1',
      name: 'Bluebird',
      active: true,
      verified: true,
      consecutiveFailures: 2,
      blockedAt: '2026-05-01T00:00:00Z',
      lastCrawledAt: '2026-05-01T00:00:00Z',
      lastRun: {
        id: 'run-1',
        venueId: 'v1',
        status: 'failed',
        createdAt: '2026-05-01T00:00:00Z',
        eventsFound: 3,
        eventsInserted: 3,
        errorMessage: 'timeout',
        extractionStrategyUsed: 'llm',
      },
    }
    const row = toStatusRow(raw)
    expect(row.venueId).toBe('v1')
    expect(row.venueName).toBe('Bluebird')
    expect(row.status).toBe('failed')
    expect(row.strategy).toBe('llm')
    expect(row.consecutiveFailures).toBe(2)
    expect(row.blockedAt).toBe('2026-05-01T00:00:00Z')
    expect(row.error).toBe('timeout')
  })

  it('handles venue with no lastRun', () => {
    const raw: RawVenueStatus = {
      id: 'v1',
      name: 'Bluebird',
      active: true,
      verified: true,
      consecutiveFailures: 0,
      blockedAt: null,
      lastCrawledAt: null,
      lastRun: null,
    }
    const row = toStatusRow(raw)
    expect(row.status).toBe('never')
    expect(row.strategy).toBeNull()
    expect(row.lastRunAt).toBeNull()
  })
})
