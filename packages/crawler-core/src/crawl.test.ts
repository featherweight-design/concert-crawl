import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, and, desc } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { crawlVenue } from './crawl.js'

const mockBrowser = {} as Browser

// In-memory stores — vi.hoisted ensures these are available inside vi.mock factories
const stores = vi.hoisted(() => ({
  venues: [] as any[],
  events: [] as any[],
  crawlRuns: [] as any[],
  notifications: [] as any[],
  costTracking: [] as any[],
}))

// Mock the entire @concert-crawl/db module with an in-memory chainable builder.
// This avoids any real Postgres connection in CI.
vi.mock('@concert-crawl/db', () => {
  // Minimal table markers — only need the _t tag for store dispatch
  const venues = { _t: 'venues' }
  const events = { _t: 'events' }
  const crawlRuns = { _t: 'crawlRuns' }
  const notifications = { _t: 'notifications' }
  const costTracking = { _t: 'costTracking' }

  function getStore(table: any): any[] {
    return stores[table._t as keyof typeof stores] ?? []
  }

  // select() builder: from() sets the target store, where/orderBy are no-ops,
  // limit(-n) slices from the end (simulates DESC ordering by insertion time)
  function makeSelectBuilder() {
    let _store: any[] = []
    let _limit: number | null = null
    const b: any = {
      from: (t: any) => {
        _store = getStore(t)
        return b
      },
      where: () => b,
      orderBy: () => b,
      limit: (n: number) => {
        _limit = n
        return b
      },
      then: (res: any, rej: any) => {
        const data = _limit !== null ? _store.slice(-_limit) : [..._store]
        return Promise.resolve(data).then(res, rej)
      },
    }
    return b
  }

  // insert() builder: values() pushes rows into the store with sensible defaults.
  // returning() resolves with the inserted rows (mimics Drizzle's RETURNING).
  function makeInsertBuilder(table: any) {
    const store = getStore(table)
    let _rows: any[] = []
    const b: any = {
      values: (v: any) => {
        const vals = Array.isArray(v) ? v : [v]
        _rows = vals.map((row: any) => ({
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          eventsFound: 0,
          eventsInserted: 0,
          verified: false,
          consecutiveFailures: 0,
          ...row,
        }))
        store.push(..._rows)
        return b
      },
      onConflictDoUpdate: () => b,
      returning: () => Promise.resolve(_rows),
      then: (res: any, rej: any) => Promise.resolve(_rows).then(res, rej),
    }
    return b
  }

  // update() builder: set() stores the patch, where is a no-op,
  // awaiting applies the patch to every row in the store (safe because
  // each test works with a single isolated venue in fresh stores).
  function makeUpdateBuilder(table: any) {
    const store = getStore(table)
    let _set: any = {}
    const b: any = {
      set: (data: any) => {
        _set = data
        return b
      },
      where: () => b,
      returning: () => {
        store.forEach((row: any) => Object.assign(row, _set))
        return Promise.resolve(store)
      },
      then: (res: any, rej: any) => {
        store.forEach((row: any) => Object.assign(row, _set))
        return Promise.resolve(store).then(res, rej)
      },
    }
    return b
  }

  function makeDeleteBuilder() {
    const b: any = {
      where: () => b,
      then: (res: any, rej: any) => Promise.resolve([]).then(res, rej),
    }
    return b
  }

  const db = {
    select: (_projection?: any) => makeSelectBuilder(),
    insert: (table: any) => makeInsertBuilder(table),
    update: (table: any) => makeUpdateBuilder(table),
    delete: (_table: any) => makeDeleteBuilder(),
  }

  return { db, venues, events, crawlRuns, notifications, costTracking }
})

vi.mock('./lib/fetcher.js', () => ({
  fetchPage: vi.fn(),
  fetchPageHttp: vi.fn(),
  CrawlFetchError: class CrawlFetchError extends Error {
    constructor(
      public httpStatus: number,
      message: string,
    ) {
      super(message)
    }
  },
}))
vi.mock('./lib/robots.js', () => ({
  isAllowed: vi.fn().mockResolvedValue(true),
}))
vi.mock('./lib/extractors/llm.js', () => ({
  extractWithLlm: vi.fn(),
}))

import { fetchPage, fetchPageHttp } from './lib/fetcher.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import {
  db,
  venues,
  events,
  crawlRuns,
  notifications,
  costTracking,
} from '@concert-crawl/db'

const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

beforeEach(() => {
  stores.venues.length = 0
  stores.events.length = 0
  stores.crawlRuns.length = 0
  stores.notifications.length = 0
  stores.costTracking.length = 0
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
})

// Push a venue directly into the in-memory store — no DB round-trip needed.
function seedVenue(overrides: Record<string, unknown> = {}) {
  const venue = {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: `test-venue-${crypto.randomUUID()}`,
    websiteUrl: 'https://test-venue.example.com',
    city: 'Denver',
    active: true,
    verified: true,
    consecutiveFailures: 0,
    blockedAt: null,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'networkidle' as const,
    crawlWaitForSelector: null,
    crawlMode: 'browser' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
  stores.venues.push(venue)
  return venue
}

const HTML_V1 =
  '<html><body><p>Event: Metallica on 2026-08-15</p></body></html>'
const HTML_V2 =
  '<html><body><p>Event: Metallica on 2026-08-15. Doors at 7pm.</p></body></html>'
// HTML with embedded JSON-LD — used to test auto-detect HTTP path (no LLM needed)
const HTML_WITH_JSON_LD = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"MusicEvent","name":"Metallica Live","startDate":"2026-08-15","performer":{"@type":"MusicGroup","name":"Metallica"}}</script></head><body></body></html>`

const METALLICA_EVENT = {
  title: 'Metallica Live',
  artist: 'Metallica',
  date: '2026-08-15',
  doorsTime: undefined,
  showTime: undefined,
  ticketUrl: 'https://test-venue.example.com/tickets',
  sourceUrl: 'https://test-venue.example.com',
  confidence: 0.95,
}

describe('crawlVenue — page-level skip', () => {
  it('returns early with eventsFound=0 when page hash matches last successful run', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser) // first crawl — extracts event, stores pageHash

    const run = await crawlVenue(venue.id, mockBrowser) // second crawl — same HTML, should skip

    expect(run.eventsFound).toBe(0)
    expect(run.eventsInserted).toBe(0)
    expect(run.status).toBe('success')

    // The most-recent crawl run (slice(-1)) should carry the pageHash
    const [skippedRun] = await db
      .select()
      .from(crawlRuns)
      .where(eq(crawlRuns.venueId, venue.id))
      .orderBy(desc(crawlRuns.createdAt))
      .limit(1)
    expect(skippedRun?.pageHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('proceeds to extraction when page hash differs', async () => {
    const venue = seedVenue()
    mockFetchPage
      .mockResolvedValueOnce({
        html: HTML_V1,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
      .mockResolvedValueOnce({
        html: HTML_V2,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser) // first crawl
    const run = await crawlVenue(venue.id, mockBrowser) // second crawl — page changed

    expect(run.eventsFound).toBe(1)
    expect(run.eventsInserted).toBe(0) // sourceHash matches despite page change
  })
})

describe('crawlVenue — event-level sourceHash', () => {
  it('skips DB write for unchanged non-verified events', async () => {
    const venue = seedVenue()
    mockFetchPage
      .mockResolvedValueOnce({
        html: HTML_V1,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
      .mockResolvedValueOnce({
        html: HTML_V2,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run1 = await crawlVenue(venue.id, mockBrowser)
    expect(run1.eventsInserted).toBe(1) // new event inserted

    const run2 = await crawlVenue(venue.id, mockBrowser) // same event content, different page hash
    expect(run2.eventsInserted).toBe(0) // unchanged — skipped

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id))
    expect(allEvents).toHaveLength(1)
  })

  it('inserts admin alert when a verified event sourceHash changes', async () => {
    const venue = seedVenue()
    const updatedEvent = { ...METALLICA_EVENT, doorsTime: '19:00' } // content changed

    mockFetchPage
      .mockResolvedValueOnce({
        html: HTML_V1,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
      .mockResolvedValueOnce({
        html: HTML_V2,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
    mockExtractWithLlm
      .mockResolvedValueOnce({
        events: [METALLICA_EVENT],
        usage: { inputTokens: 100, outputTokens: 50 },
      })
      .mockResolvedValueOnce({
        events: [updatedEvent],
        usage: { inputTokens: 100, outputTokens: 50 },
      })

    await crawlVenue(venue.id, mockBrowser) // first crawl — inserts unverified event

    // Mark event as verified in the in-memory store
    await db
      .update(events)
      .set({ verified: true })
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Metallica')))

    await crawlVenue(venue.id, mockBrowser) // second crawl — verified event content changed

    const allAlerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.verified_event_changed'))

    const venueAlert = allAlerts.find((a) => {
      try {
        const meta = a.metadata ? JSON.parse(a.metadata) : {}
        return meta.venueId === venue.id
      } catch {
        return false
      }
    })

    expect(venueAlert).toBeDefined()
    expect(venueAlert?.body).toContain('Metallica Live')
  })

  it('upserts existing event when sourceHash is null without changed-verified alert', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    stores.events.push({
      id: crypto.randomUUID(),
      venueId: venue.id,
      title: METALLICA_EVENT.title,
      artist: METALLICA_EVENT.artist,
      date: METALLICA_EVENT.date,
      sourceHash: null,
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    // null-hash backfill counts as an update to an existing event, not a new insertion
    expect(run.eventsInserted).toBe(0)
    expect(run.eventsUpdated).toBe(1)

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id))
    const hashedRow = allEvents.find((e) => e.sourceHash != null)
    expect(hashedRow?.sourceHash).toMatch(/^[0-9a-f]{64}$/)

    const allAlerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.verified_event_changed'))
    expect(allAlerts).toHaveLength(0)
  })
})

describe('crawlVenue — intra-batch deduplication', () => {
  it('inserts only one row when LLM returns duplicate (artist, date) pairs', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    // LLM returns the same artist+date twice (a realistic hallucination for
    // large venue event pages). Without deduplication this triggers:
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    mockExtractWithLlm.mockResolvedValue({
      events: [
        METALLICA_EVENT,
        { ...METALLICA_EVENT, title: 'Metallica Live (duplicate)' },
      ],
      usage: { inputTokens: 200, outputTokens: 100 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('success')
    expect(run.eventsInserted).toBe(1)

    const venueEvents = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id))
    expect(venueEvents).toHaveLength(1)
  })
})

describe('crawlVenue — fetch options', () => {
  it('passes venue crawlWaitUntil and crawlDelayMs to fetchPage', async () => {
    const venue = seedVenue({ crawlWaitUntil: 'load' as const })
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 10, outputTokens: 5 },
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalledWith(
      venue.websiteUrl,
      mockBrowser,
      3000,
      'load',
      undefined,
    )
  })

  it('passes crawlWaitForSelector to fetchPage when set on venue', async () => {
    const venue = seedVenue({ crawlWaitForSelector: '.event-list-item' })
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalledWith(
      venue.websiteUrl,
      mockBrowser,
      venue.crawlDelayMs,
      venue.crawlWaitUntil,
      '.event-list-item',
    )
  })

  it('passes undefined to fetchPage when crawlWaitForSelector is null', async () => {
    const venue = seedVenue({ crawlWaitForSelector: null })
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalledWith(
      venue.websiteUrl,
      mockBrowser,
      venue.crawlDelayMs,
      venue.crawlWaitUntil,
      undefined,
    )
  })
})

describe('crawlVenue — LLM cost tracking', () => {
  it('persists non-null llmCostUsd and writes cost_tracking row when LLM is used', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: {
        inputTokens: 200,
        outputTokens: 80,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.llmCostUsd).not.toBeNull()
    expect(typeof run.llmCostUsd).toBe('number')
    expect(run.llmCostUsd).toBeGreaterThan(0)

    const allCostRows = await db.select().from(costTracking)
    const costRow = allCostRows.find((row: any) => {
      try {
        const meta = row.metadata ? JSON.parse(row.metadata) : {}
        return meta.venueId === venue.id
      } catch {
        return false
      }
    })
    expect(costRow).toBeDefined()
    expect(costRow?.service).toBe('claude')
  })

  it('stores null llmCostUsd and writes no cost_tracking row when structured-data extraction is used', async () => {
    const venue = seedVenue()

    const jsonLdHtml = `<html><head>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Metallica Live',
        startDate: '2026-08-15T20:00:00',
        location: { '@type': 'Place', name: 'Test Venue' },
        url: 'https://test-venue.example.com/tickets',
      })}</script>
    </head><body></body></html>`

    mockFetchPage.mockResolvedValue({
      html: jsonLdHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.llmCostUsd).toBeNull()
    expect(mockExtractWithLlm).not.toHaveBeenCalled()

    const allCostRows = await db.select().from(costTracking)
    const costRow = allCostRows.find((row: any) => {
      try {
        const meta = row.metadata ? JSON.parse(row.metadata) : {}
        return meta.venueId === venue.id
      } catch {
        return false
      }
    })
    expect(costRow).toBeUndefined()
  })
})

describe('crawlVenue — crawlMode orchestration', () => {
  const FETCH_RESULT = {
    html: HTML_V1,
    httpStatus: 200,
    finalUrl: 'https://test-venue.example.com',
  }

  beforeEach(() => {
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })
  })

  it('uses fetchPageHttp when crawlMode is http', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalledWith(
      venue.websiteUrl,
      venue.crawlDelayMs,
    )
    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('uses fetchPage when crawlMode is browser', async () => {
    const venue = seedVenue({ crawlMode: 'browser' })
    mockFetchPage.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalledWith(
      venue.websiteUrl,
      mockBrowser,
      venue.crawlDelayMs,
      venue.crawlWaitUntil,
      undefined,
    )
    expect(mockFetchPageHttp).not.toHaveBeenCalled()
  })

  it('auto-detect: saves crawlMode=http when HTTP fetch returns JSON-LD events (no LLM called)', async () => {
    const venue = seedVenue({ crawlMode: null })
    mockFetchPageHttp.mockResolvedValue({
      html: HTML_WITH_JSON_LD,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalled()
    expect(mockFetchPage).not.toHaveBeenCalled()
    expect(mockExtractWithLlm).not.toHaveBeenCalled()

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('http')
  })

  it('auto-detect: falls back to browser and saves crawlMode=browser when HTTP has no JSON-LD', async () => {
    const venue = seedVenue({ crawlMode: null })
    const emptyHtml = '<html><body>No events here</body></html>'
    mockFetchPageHttp.mockResolvedValue({
      html: emptyHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockFetchPage.mockResolvedValue(FETCH_RESULT)
    // LLM is only called once — on the browser HTML, never on HTTP HTML
    mockExtractWithLlm.mockResolvedValueOnce({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalled()
    expect(mockFetchPage).toHaveBeenCalled()
    expect(mockExtractWithLlm).toHaveBeenCalledTimes(1)

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('browser')
  })

  it('auto-detect: falls back to browser and saves crawlMode=browser when HTTP fetch throws', async () => {
    const venue = seedVenue({ crawlMode: null })
    mockFetchPageHttp.mockRejectedValue(new Error('network error'))
    mockFetchPage.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).toHaveBeenCalled()

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('browser')
  })

  it('forced http: does not fall back to browser when HTTP returns no events', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    const emptyHtml = '<html><body>No events</body></html>'
    mockFetchPageHttp.mockResolvedValue({
      html: emptyHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 50, outputTokens: 10 },
    })

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('forced http: propagates fetch errors without falling back', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockRejectedValue(new Error('timeout'))

    const result = await crawlVenue(venue.id, mockBrowser)

    expect(result.status).toBe('failed')
    expect(mockFetchPage).not.toHaveBeenCalled()
  })

  it('does not overwrite a stored crawlMode on subsequent crawls', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.crawlMode).toBe('http')
  })

  it('sets blockedAt when a TimeoutError occurs on the 3rd consecutive failure', async () => {
    const timeoutError = new Error('Timeout exceeded')
    timeoutError.name = 'TimeoutError'

    // Venue already has 2 consecutive failures — this crawl makes it 3
    const venue = seedVenue({ consecutiveFailures: 2 })
    mockFetchPage.mockRejectedValue(timeoutError)

    const result = await crawlVenue(venue.id, mockBrowser)

    expect(result.status).toBe('failed')

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.blockedAt).not.toBeNull()
  })

  it('does not set blockedAt for a TimeoutError before 3 consecutive failures', async () => {
    const timeoutError = new Error('Timeout exceeded')
    timeoutError.name = 'TimeoutError'

    // Only 1 prior failure — should not block yet
    const venue = seedVenue({ consecutiveFailures: 1 })
    mockFetchPage.mockRejectedValue(timeoutError)

    await crawlVenue(venue.id, mockBrowser)

    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.blockedAt).toBeNull()
  })
})

describe('crawlVenue — debug HTML capture', () => {
  it('logs the fetched HTML to stdout when debugCaptureHtml is true', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await crawlVenue(venue.id, mockBrowser)

      const captureLine = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('"event":"debug.html_capture"'))

      expect(captureLine).toBeDefined()
      const captureEntry = JSON.parse(captureLine!)
      expect(captureEntry).toMatchObject({
        event: 'debug.html_capture',
        venueId: venue.id,
        venueSlug: venue.slug,
        mode: 'browser',
        httpStatus: 200,
        totalLength: HTML_V1.length,
        truncated: false,
        htmlHead: HTML_V1,
      })
      expect(captureEntry.crawlRunId).toMatch(
        /^[0-9a-f-]{36}$/, // uuid
      )
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('does not log capture when debugCaptureHtml is false', async () => {
    const venue = seedVenue({ debugCaptureHtml: false })
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await crawlVenue(venue.id, mockBrowser)

      const captureLine = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('"event":"debug.html_capture"'))

      expect(captureLine).toBeUndefined()
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('truncates HTML and includes a tail when over the cap', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    // 50KB of repeated content — exceeds the 45KB head+tail cap
    const bigHtml = '<html><body>' + 'A'.repeat(50_000) + '</body></html>'
    mockFetchPage.mockResolvedValue({
      html: bigHtml,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [METALLICA_EVENT],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await crawlVenue(venue.id, mockBrowser)

      const captureLine = consoleSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('"event":"debug.html_capture"'))

      expect(captureLine).toBeDefined()
      const captureEntry = JSON.parse(captureLine!)
      expect(captureEntry.truncated).toBe(true)
      expect(captureEntry.totalLength).toBe(bigHtml.length)
      expect(captureEntry.htmlHead.length).toBe(40_000)
      expect(captureEntry.htmlTail.length).toBe(5_000)
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
