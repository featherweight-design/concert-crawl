import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, and, desc } from 'drizzle-orm'
import { crawlVenue } from './crawl.js'

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

import { fetchPage } from './lib/fetcher.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import { db, venues, events, crawlRuns, notifications } from '@concert-crawl/db'

const mockFetchPage = vi.mocked(fetchPage)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

beforeEach(() => {
  stores.venues.length = 0
  stores.events.length = 0
  stores.crawlRuns.length = 0
  stores.notifications.length = 0
  stores.costTracking.length = 0
  mockFetchPage.mockClear()
  mockExtractWithLlm.mockClear()
})

// Push a venue directly into the in-memory store — no DB round-trip needed.
function seedVenue() {
  const venue = {
    id: crypto.randomUUID(),
    name: 'Test Venue',
    slug: `test-venue-${crypto.randomUUID()}`,
    websiteUrl: 'https://test-venue.example.com',
    city: 'Denver',
    active: true,
    verified: true,
    consecutiveFailures: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  stores.venues.push(venue)
  return venue
}

const HTML_V1 =
  '<html><body><p>Event: Metallica on 2026-08-15</p></body></html>'
const HTML_V2 =
  '<html><body><p>Event: Metallica on 2026-08-15. Doors at 7pm.</p></body></html>'

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

    await crawlVenue(venue.id) // first crawl — extracts event, stores pageHash

    const run = await crawlVenue(venue.id) // second crawl — same HTML, should skip

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

    await crawlVenue(venue.id) // first crawl
    const run = await crawlVenue(venue.id) // second crawl — page changed

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

    const run1 = await crawlVenue(venue.id)
    expect(run1.eventsInserted).toBe(1) // new event inserted

    const run2 = await crawlVenue(venue.id) // same event content, different page hash
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

    await crawlVenue(venue.id) // first crawl — inserts unverified event

    // Mark event as verified in the in-memory store
    await db
      .update(events)
      .set({ verified: true })
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Metallica')))

    await crawlVenue(venue.id) // second crawl — verified event content changed

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
})
