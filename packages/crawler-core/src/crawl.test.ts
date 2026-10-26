import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, and, desc } from 'drizzle-orm'
import type { Browser } from 'playwright'

// Mock the email module so we can control timing + assert await behavior
// (regression coverage for #649). The real implementation reads env vars +
// calls Resend; for unit tests we only care about call sequencing. Both
// helpers are stubbed because event-count-alert.ts (called by the success
// path) imports sendEventCountDropEmail through the same module.
const mockSendCrawlFailureEmail = vi.hoisted(() => vi.fn())
const mockSendEventCountDropEmail = vi.hoisted(() => vi.fn())
vi.mock('./lib/email.js', () => ({
  sendCrawlFailureEmail: mockSendCrawlFailureEmail,
  sendEventCountDropEmail: mockSendEventCountDropEmail,
}))

// Platform-fetcher dispatch. Defaults to null so every other test in this
// file keeps running the HTML → JSON-LD → LLM cascade; the platform-budget
// tests opt in by returning a fake fetcher.
const mockDispatch = vi.hoisted(() => vi.fn())
vi.mock('./lib/fetchers/index.js', () => ({ dispatch: mockDispatch }))

import {
  crawlVenue,
  DEBUG_CAPTURE_CHUNK_CHARS,
  DEBUG_CAPTURE_MAX_CHARS,
  stripStyleBlocks,
} from './crawl.js'
import { hashEvent } from './lib/hash.js'
import { canonicalizeTitle } from './lib/canonical-title.js'

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
  CrawlSelectorTimeoutError: class CrawlSelectorTimeoutError extends Error {
    constructor(
      public selector: string,
      public html: string | null,
      public finalUrl: string,
      public httpStatus: number,
      message: string,
    ) {
      super(message)
      this.name = 'CrawlSelectorTimeoutError'
    }
  },
}))
vi.mock('./lib/robots.js', async (importOriginal) => ({
  // resolveCrawlDelayMs is pure arithmetic over values the caller passes in, so
  // stubbing it would only ever test the stub. Keep the real one.
  ...(await importOriginal<typeof import('./lib/robots.js')>()),
  isAllowed: vi.fn().mockResolvedValue(true),
  isAllowedOrSkip: vi.fn().mockResolvedValue(true),
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAiUseAllowed: vi.fn().mockResolvedValue(true),
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
}))
vi.mock('./lib/extractors/llm.js', () => ({
  extractWithLlm: vi.fn(),
  // Rejecting keeps every existing case on the ladder's step-3 path: no
  // headliners, isConcert left true. A test that wants a real verdict
  // overrides this per-case. The point is that no test in this file ever
  // reaches the network, and a case that escalates fails loudly rather than
  // silently spending a call.
  adjudicateEvent: vi
    .fn()
    .mockRejectedValue(
      new Error('adjudicateEvent is not stubbed for this test'),
    ),
}))

import {
  fetchPage,
  fetchPageHttp,
  CrawlSelectorTimeoutError,
} from './lib/fetcher.js'
import { extractWithLlm } from './lib/extractors/llm.js'
import {
  CrawlSkipError,
  checkRobots,
  getCrawlDelayMs,
  isAiUseAllowed,
} from './lib/robots.js'
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
  mockDispatch.mockReset()
  mockDispatch.mockReturnValue(null)
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
  // rawTitle mirrors the LLM-stripped title since this is a unit-test
  // fixture; the cross-venue presale filter (#826) cares about
  // pre-strip listing decoration we don't simulate here.
  rawTitle: 'Metallica Live',
  artist: 'Metallica',
  // What the extractor SAW, in billing order. The derivation ladder reads
  // this, not `artist` — a fixture without it escalates to the adjudicator,
  // which these tests deliberately leave unstubbed.
  observedPerformers: ['Metallica'],
  // Every extractor and fetcher populates this, empty when it saw no openers,
  // so a fixture that omitted it would exercise a shape production never
  // produces.
  observedSupportingArtists: [],
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
    expect(run.status).toBe('skipped')

    // The most-recent crawl run (slice(-1)) should carry the pageHash
    const [skippedRun] = await db
      .select()
      .from(crawlRuns)
      .where(eq(crawlRuns.venueId, venue.id))
      .orderBy(desc(crawlRuns.createdAt))
      .limit(1)
    expect(skippedRun?.pageHash).toMatch(/^[0-9a-f]{64}$/)
    expect(skippedRun?.status).toBe('skipped')
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

  it('bypasses the page-hash skip when force=true', async () => {
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

    await crawlVenue(venue.id, mockBrowser) // first crawl — stores pageHash

    // Same HTML — a normal crawl would return status='skipped'. With force the
    // crawl proceeds to extraction instead.
    const run = await crawlVenue(venue.id, mockBrowser, undefined, [], true)

    expect(run.status).not.toBe('skipped')
    expect(run.eventsFound).toBe(1)
  })
})

describe('crawlVenue — canonical_supporting writes (#763)', () => {
  it('writes canonical_supporting alongside supporting_artists — canonicalized, deduped, empty-filtered', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          ...METALLICA_EVENT,
          observedPerformers: ['Metallica'],
          observedSupportingArtists: ['MIKE', 'Niontay & Friends', 'MIKE'],
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.supportingArtists).toEqual([
      'MIKE',
      'Niontay & Friends',
      'MIKE',
    ])
    expect(insertedEvent?.canonicalSupporting).toEqual(['mike', 'niontay'])
  })

  it('writes an empty canonical_supporting when there are no supporting artists', async () => {
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

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.canonicalSupporting).toEqual([])
  })
})

describe('crawlVenue — ticketLinks derivation', () => {
  it('emits a boxoffice TicketLink when the ticketUrl host matches the venue host', async () => {
    // METALLICA_EVENT.ticketUrl is 'https://test-venue.example.com/tickets',
    // which matches the seedVenue websiteUrl host (test-venue.example.com).
    // The derived TicketLink should therefore mark kind='boxoffice'.
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

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.ticketLinks).toEqual([
      {
        kind: 'boxoffice',
        vendor: null,
        url: 'https://test-venue.example.com/tickets',
      },
    ])
  })

  it('emits a primary TicketLink with Ticketmaster vendor when the ticketUrl is on ticketmaster.com', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          ...METALLICA_EVENT,
          ticketUrl: 'https://www.ticketmaster.com/event/foo',
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.ticketLinks).toEqual([
      {
        kind: 'primary',
        vendor: 'Ticketmaster',
        url: 'https://www.ticketmaster.com/event/foo',
      },
    ])
  })

  it('emits null ticketLinks when the extracted event has no ticketUrl', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [{ ...METALLICA_EVENT, ticketUrl: undefined }],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.ticketLinks).toBeNull()
  })

  it('normalizes an empty-string ticketUrl to null on both columns (no inconsistent state)', async () => {
    // Regression for PR 722 audit: an LLM/JSON-LD path that yields ticketUrl=''
    // would persist as the literal empty string while ticketLinks became null
    // (deriveTicketLinks treats '' as missing). Downstream consumers couldn't
    // tell that the URL is unavailable. The crawler now coerces empty → null
    // for both columns so they agree.
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [{ ...METALLICA_EVENT, ticketUrl: '' }],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.ticketUrl).toBeNull()
    expect(insertedEvent?.ticketLinks).toBeNull()
  })

  it('persists the extracted eventUrl as the ticket deep-link fallback (#1152)', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          ...METALLICA_EVENT,
          ticketUrl: undefined,
          eventUrl: 'https://test-venue.example.com/events/metallica-1489047/',
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.eventUrl).toBe(
      'https://test-venue.example.com/events/metallica-1489047/',
    )
  })

  it('normalizes an empty-string eventUrl to null (#1152)', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [{ ...METALLICA_EVENT, eventUrl: '' }],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    const insertedEvent = stores.events.find(
      (row: { venueId: string }) => row.venueId === venue.id,
    )
    expect(insertedEvent?.eventUrl).toBeNull()
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

  it('does NOT fire crawl.verified_event_changed when only the show_time string FORMAT changes (HH:MM vs HH:MM:SS) (#1053)', async () => {
    const venue = seedVenue()
    // Same listing, same show time — one crawl emits 'HH:MM', the next
    // emits the Postgres 'HH:MM:SS' form. showTimeKey normalizes both
    // before hashing, so the sourceHash must not churn and no verified
    // alert should fire.
    const firstCrawlEvent = { ...METALLICA_EVENT, showTime: '20:00' }
    const secondCrawlEvent = { ...METALLICA_EVENT, showTime: '20:00:00' }

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
        events: [firstCrawlEvent],
        usage: { inputTokens: 100, outputTokens: 50 },
      })
      .mockResolvedValueOnce({
        events: [secondCrawlEvent],
        usage: { inputTokens: 100, outputTokens: 50 },
      })

    await crawlVenue(venue.id, mockBrowser) // first crawl — inserts unverified event

    await db
      .update(events)
      .set({ verified: true })
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Metallica')))

    await crawlVenue(venue.id, mockBrowser) // second crawl — format-only show_time change

    const allAlerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.verified_event_changed'))
    expect(allAlerts).toHaveLength(0)
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
      canonicalArtist: 'metallica',
      canonicalTitle: 'metallica live',
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

  it('does NOT fire crawl.verified_event_changed when a re-crawl matches by canonical_artist + show_time and the event hash is unchanged (#825/#1053)', async () => {
    // Production regression: hashEvent used to include `artist`, so a
    // re-crawl that picked a different headliner substring would shift the
    // stored sourceHash and trip the verified-event-changed alert even
    // though title/date/doors/show were identical. hashEvent now ignores
    // artist. This is the crawlVenue-level end-to-end guard that the
    // notification path agrees.
    //
    // Under the #1053 re-key the dedup lookup now matches by
    // (canonical_artist, date, show_time), so the seeded row and the
    // re-crawl must share the same canonical_artist value for the
    // existingMap lookup to hit and the hash comparison to fire.
    const venue = seedVenue()
    const sharedDate = '2026-08-15'
    const sharedArtist = 'Hilary Duff'
    const canonicalArtistValue = 'hilary duff'

    // Seed an existing verified row with sourceHash computed under the
    // post-#825 signature — title/date/doors/show only, no artist.
    const firstTitle = 'Hilary Duff'
    const seededHash = hashEvent({
      title: firstTitle,
      date: sharedDate,
      doorsTime: null,
      showTime: null,
    })
    stores.events.push({
      id: crypto.randomUUID(),
      venueId: venue.id,
      title: firstTitle,
      artist: sharedArtist,
      canonicalArtist: canonicalArtistValue,
      canonicalTitle: canonicalizeTitle(firstTitle),
      date: sharedDate,
      doorsTime: null,
      showTime: null,
      sourceHash: seededHash,
      verified: true,
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    // Re-crawl returns the same headliner and the same title, so the hash
    // (title/date/doors/show — no artist) is unchanged. The point of the
    // test is the #1053 lookup path: the re-crawl must find the seeded row
    // via (canonical_artist, date, show_time) and, because the hash matches,
    // fire no verified-event-changed alert. (A genuine title change would
    // shift the hash and correctly fire the alert — covered elsewhere.)
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: firstTitle,
          rawTitle: firstTitle,
          artist: sharedArtist,
          date: sharedDate,
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl: 'https://test-venue.example.com/tickets',
          sourceUrl: 'https://test-venue.example.com',
          confidence: 0.95,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    // No verified-event-changed alert should fire — hash matches.
    const allAlerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.verified_event_changed'))
    expect(allAlerts).toHaveLength(0)

    // Because the hash matched and the event was skipped, the seeded row
    // is the only one with this canonical_artist.
    const venueRowsWithArtist = stores.events.filter(
      (row: { venueId: string; canonicalArtist: string }) =>
        row.venueId === venue.id &&
        row.canonicalArtist === canonicalArtistValue,
    )
    expect(venueRowsWithArtist).toHaveLength(1)
    // The seeded artist stays put — the artist-frozen rule from #824
    // (artist intentionally NOT in onConflictDoUpdate.set).
    expect(venueRowsWithArtist[0].artist).toBe(sharedArtist)
  })

  it('does NOT fire crawl.verified_event_changed when the stored sourceHash predates a hash-scheme change but the source fields are unchanged (#1124)', async () => {
    // Regression for the one-time churn observed after #1053 landed
    // showTimeKey normalization inside hashEvent: every verified row
    // hashed under the previous scheme has a stored sourceHash that no
    // longer equals the current hash of identical source data. The old
    // hash-inequality check fired verified_event_changed on the first
    // crawl after the scheme change for every such row. The field
    // comparison must instead see title/doors/show are unchanged and
    // stay silent.
    const venue = seedVenue()
    const sharedDate = '2026-08-15'

    // Seed a verified row whose stored sourceHash is a valid-format hex
    // string that does NOT match what hashEvent would produce today for
    // the same fields — simulating a hash written by an older scheme.
    const staleHash = 'a'.repeat(64)
    stores.events.push({
      id: crypto.randomUUID(),
      venueId: venue.id,
      title: METALLICA_EVENT.title,
      artist: METALLICA_EVENT.artist,
      canonicalArtist: 'metallica',
      canonicalTitle: canonicalizeTitle(METALLICA_EVENT.title),
      date: sharedDate,
      doorsTime: null,
      showTime: null,
      sourceHash: staleHash,
      verified: true,
      status: 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    // Re-crawl emits the identical listing — same title, no doors/show.
    mockExtractWithLlm.mockResolvedValue({
      events: [{ ...METALLICA_EVENT, date: sharedDate }],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await crawlVenue(venue.id, mockBrowser)

    // Source fields unchanged → no alert, despite the stale stored hash.
    const allAlerts = await db
      .select()
      .from(notifications)
      .where(eq(notifications.category, 'crawl.verified_event_changed'))
    expect(allAlerts).toHaveLength(0)
  })
})

describe('crawlVenue — intra-batch deduplication', () => {
  it('inserts only one row when LLM returns the same listing twice with the same canonical_artist (#1053)', async () => {
    const venue = seedVenue()
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    // #1053 case: LLM returns the same listing twice in a single extraction
    // batch, with the same headliner but different billing titles and no
    // show_time. Both have the same (canonical_artist, date, show_time) →
    // the in-memory dedup key collapses them to one before the upsert.
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Hilary Duff',
          rawTitle: 'Hilary Duff',
          artist: 'Hilary Duff',
          date: '2026-08-15',
          confidence: 0.9,
          sourceUrl: 'https://test-venue.example.com',
        },
        {
          title: 'Hilary Duff with La Roux',
          rawTitle: 'Hilary Duff with La Roux',
          artist: 'Hilary Duff',
          date: '2026-08-15',
          confidence: 0.9,
          sourceUrl: 'https://test-venue.example.com',
        },
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

describe('crawlVenue — zero-event crawls (#1162)', () => {
  it('records partial and leaves the failure counter alone when nothing is extracted', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 100, outputTokens: 10 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('partial')
    expect(run.eventsFound).toBe(0)

    // The old success path reset this to 0 every night, so a venue that
    // silently extracted nothing could never reach the 3-strikes auto-pause.
    const stored = stores.venues.find((row) => row.id === venue.id)
    expect(stored?.consecutiveFailures).toBe(2)
  })

  it('records partial when every extracted row is dropped by a downstream guard', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    // Extraction produced a row, but the canonical-title guard drops it — the
    // run learned just as little as one that extracted nothing, so status has
    // to key off what actually survived, not the raw extraction count.
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: '   ',
          rawTitle: '   ',
          artist: '   ',
          date: '2026-08-15',
          confidence: 0.9,
          sourceUrl: 'https://test-venue.example.com',
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('partial')
    expect(run.eventsInserted).toBe(0)
    // eventsFound stays at the raw extraction count deliberately: it is the
    // baseline metric #624 averages over historical rows, so it has to keep
    // meaning "what the extractor returned". Status is what carries "nothing
    // survived" — see #1167 for the went-dark gap this leaves open.
    expect(run.eventsFound).toBe(1)
    const stored = stores.venues.find((row) => row.id === venue.id)
    expect(stored?.consecutiveFailures).toBe(2)
  })

  it('records success and clears the failure counter when events are extracted', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Metallica',
          rawTitle: 'Metallica',
          artist: 'Metallica',
          date: '2026-08-15',
          confidence: 0.9,
          sourceUrl: 'https://test-venue.example.com',
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('success')
    const stored = stores.venues.find((row) => row.id === venue.id)
    expect(stored?.consecutiveFailures).toBe(0)
  })
})

describe('crawlVenue — cross-venue presale filter (#605)', () => {
  it('skips events whose title names another known venue and emits a structured log', async () => {
    const sourceVenue = seedVenue({
      name: "Cervantes' Masterpiece Ballroom",
      slug: 'cervantes-masterpiece-ballroom',
    })
    const targetVenueId = crypto.randomUUID()
    const candidates = [
      {
        id: targetVenueId,
        slug: 'ogden-theatre',
        name: 'Ogden Theatre',
      },
    ]

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Earl Sweatshirt & MIKE AT OGDEN THEATRE',
          rawTitle: 'Earl Sweatshirt & MIKE AT OGDEN THEATRE',
          artist: 'Earl Sweatshirt',
          date: '2026-08-15',
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl: 'https://cervantes.example.com/tickets',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const run = await crawlVenue(
      sourceVenue.id,
      mockBrowser,
      undefined,
      candidates,
    )

    // Every candidate was filtered out, so the run extracted nothing — that
    // records as 'partial', not 'success' (#1162).
    expect(run.status).toBe('partial')
    expect(run.eventsInserted).toBe(0)

    const sourceRows = await db
      .select()
      .from(events)
      .where(eq(events.venueId, sourceVenue.id))
    expect(sourceRows).toHaveLength(0)

    // Structured log was emitted with the expected payload shape.
    const skipLogs = logSpy.mock.calls
      .map((args) => args[0])
      .filter(
        (line): line is string =>
          typeof line === 'string' && line.includes('crawler.skip_cross_venue'),
      )
      .map((line) => JSON.parse(line) as Record<string, unknown>)

    expect(skipLogs).toHaveLength(1)
    expect(skipLogs[0]).toMatchObject({
      event: 'crawler.skip_cross_venue',
      sourceVenueSlug: sourceVenue.slug,
      matchedVenueSlug: 'ogden-theatre',
      title: 'Earl Sweatshirt & MIKE AT OGDEN THEATRE',
    })

    logSpy.mockRestore()
  })

  it('does NOT skip when the title names the source venue itself (self-venue)', async () => {
    const sourceVenue = seedVenue({
      name: "Cervantes' Masterpiece Ballroom",
      slug: 'cervantes-masterpiece-ballroom',
    })
    const candidates = [
      {
        id: sourceVenue.id,
        slug: sourceVenue.slug,
        name: sourceVenue.name,
      },
    ]

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: "Some Band AT CERVANTES' MASTERPIECE BALLROOM",
          artist: 'Some Band',
          date: '2026-09-01',
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl: 'https://cervantes.example.com/tickets',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(
      sourceVenue.id,
      mockBrowser,
      undefined,
      candidates,
    )

    expect(run.status).toBe('success')
    expect(run.eventsInserted).toBe(1)
  })

  it('does NOT skip when no candidates are provided and the ticket URL names the source venue', async () => {
    const sourceVenue = seedVenue()

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Earl Sweatshirt AT OGDEN THEATRE',
          rawTitle: 'Earl Sweatshirt AT OGDEN THEATRE',
          artist: 'Earl Sweatshirt',
          date: '2026-08-15',
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl:
            'https://tickets.example.com/p/1/earl-sweatshirt-denver-test-venue',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    // Don't pass candidates → defaults to []. The known-venue path can't fire,
    // and the ticket URL names the source venue, so nothing is skipped.
    const run = await crawlVenue(sourceVenue.id, mockBrowser)

    expect(run.status).toBe('success')
    expect(run.eventsInserted).toBe(1)
  })

  // #1338 — `rawTitle` is typed as required on NormalizedEvent but is absent
  // on some real extractor outputs. Passing it through undefined doesn't
  // throw (the marker regex coerces it to the literal "undefined"), so the
  // filter used to go quiet for those sources instead of failing loudly.
  it('falls back to title when rawTitle is absent (#1338)', async () => {
    const sourceVenue = seedVenue()
    const candidates = [
      {
        id: '00000000-0000-4000-8000-000000000abc',
        slug: 'ogden-theatre',
        name: 'Ogden Theatre',
      },
    ]

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Earl Sweatshirt AT OGDEN THEATRE',
          artist: 'Earl Sweatshirt',
          date: '2026-08-15',
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl: 'https://tickets.example.com/p/1/earl-sweatshirt',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(
      sourceVenue.id,
      mockBrowser,
      undefined,
      candidates,
    )

    // The only event was filtered out, so the run extracted nothing — that
    // records as 'partial', not 'success' (#1162).
    expect(run.status).toBe('partial')
    expect(run.eventsInserted).toBe(0)
  })

  it('skips an un-crawled venue via ticket-URL corroboration (#1286)', async () => {
    const sourceVenue = seedVenue()

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Brother Ali AT THE BLACK SHEEP',
          rawTitle: 'Brother Ali AT THE BLACK SHEEP',
          artist: 'Brother Ali',
          date: '2026-08-15',
          doorsTime: undefined,
          showTime: undefined,
          // The Black Sheep is in Colorado Springs and isn't a venue we crawl,
          // so no candidate can match. The URL path is the only other signal.
          ticketUrl:
            'https://tickets.example.com/p/1/brother-ali-denver-the-black-sheep',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(sourceVenue.id, mockBrowser)

    expect(run.eventsInserted).toBe(0)
  })

  // Regression test for the 2026-06-26 Cervantes Mission-Ballroom duplicate
  // incident (issue #826). The LLM extractor strips listing decoration
  // when populating `title` ("AEG Presents Connor Price & Nic D AT MISSION
  // BALLROOM" → "AEG Presents Connor Price & Nic D"), dropping the
  // "AT MISSION BALLROOM" marker the cross-venue filter regex needs. The
  // fix plumbs the unmodified source headline through as `rawTitle` and
  // feeds THAT into the filter. This test asserts the filter still drops
  // the row when only `rawTitle` carries the marker.
  it('drops the row when only rawTitle carries the AT-marker (LLM stripped title) — #826', async () => {
    const sourceVenue = seedVenue({
      name: "Cervantes' Masterpiece Ballroom",
      slug: 'cervantes-masterpiece-ballroom',
    })
    const targetVenueId = crypto.randomUUID()
    const candidates = [
      {
        id: targetVenueId,
        slug: 'mission-ballroom',
        name: 'Mission Ballroom',
      },
    ]

    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: sourceVenue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          // Cleaned title — what the LLM put on `title` after stripping the
          // venue suffix + combining with the "AEG Presents" subhead.
          title: 'AEG Presents Connor Price & Nic D',
          // Verbatim source headline — what was actually in the Cervantes
          // events page. The cross-venue filter sees THIS.
          rawTitle: 'Connor Price & Nic D AT MISSION BALLROOM',
          artist: 'Connor Price & Nic D',
          date: '2026-08-15',
          doorsTime: undefined,
          showTime: undefined,
          ticketUrl: 'https://cervantes.example.com/tickets',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const run = await crawlVenue(
      sourceVenue.id,
      mockBrowser,
      undefined,
      candidates,
    )

    // Every candidate was filtered out, so the run extracted nothing — that
    // records as 'partial', not 'success' (#1162).
    expect(run.status).toBe('partial')
    expect(run.eventsInserted).toBe(0)

    const sourceRows = await db
      .select()
      .from(events)
      .where(eq(events.venueId, sourceVenue.id))
    expect(sourceRows).toHaveLength(0)

    // Log payload includes BOTH the cleaned title AND the raw title for
    // audit triage — operators inspecting the skip log need to see what
    // the LLM produced vs what the source page actually said.
    const skipLogs = logSpy.mock.calls
      .map((args) => args[0])
      .filter(
        (line): line is string =>
          typeof line === 'string' && line.includes('crawler.skip_cross_venue'),
      )
      .map((line) => JSON.parse(line) as Record<string, unknown>)

    expect(skipLogs).toHaveLength(1)
    expect(skipLogs[0]).toMatchObject({
      event: 'crawler.skip_cross_venue',
      sourceVenueSlug: sourceVenue.slug,
      matchedVenueSlug: 'mission-ballroom',
      title: 'AEG Presents Connor Price & Nic D',
      rawTitle: 'Connor Price & Nic D AT MISSION BALLROOM',
    })

    logSpy.mockRestore()
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

describe('crawlVenue — platform fetch budget (#1199)', () => {
  // Stands in for a real adapter so the assertions are about what crawl.ts
  // hands down, not about any one platform's request shape.
  function seedPlatformVenue(maxRequests: number, crawlDelayMs = 3000) {
    const venue = seedVenue({ crawlDelayMs })
    const fetch = vi.fn().mockResolvedValue({
      events: [],
      sourceUrl: 'https://platform.example.com/events.json',
    })
    mockDispatch.mockReturnValue({
      source: 'aeg',
      maxRequests,
      canHandle: () => true,
      fetch,
    })
    return { venue, fetch }
  }

  it("asks the platform endpoint's AI verdict, not just each event's public link", async () => {
    const { venue, fetch } = seedPlatformVenue(1)
    fetch.mockResolvedValueOnce({
      events: [
        {
          title: 'Metallica',
          rawTitle: 'Metallica',
          artist: 'Metallica',
          date: '2026-08-15',
          confidence: 1,
          sourceUrl: 'https://venue.example.com/calendar',
        },
      ],
      sourceUrl: 'https://platform.example.com/graphql',
    })

    await crawlVenue(venue.id, mockBrowser)

    const asked = vi.mocked(isAiUseAllowed).mock.calls.map(([url]) => url)
    expect(asked).toContain('https://venue.example.com/calendar')
    expect(asked).toContain('https://platform.example.com/graphql')
  })

  it('records a skipped run and no strike when the adapter declines on robots.txt', async () => {
    const { venue, fetch } = seedPlatformVenue(1)
    fetch.mockRejectedValueOnce(
      new CrawlSkipError('robots.txt unreachable for the API; not crawled'),
    )

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('skipped')
    expect(run.robotsTxtBlocked).toBe('unchecked')
    expect(run.errorMessage).toContain('robots.txt unreachable')
    const stored = stores.venues.find((row) => row.id === venue.id)
    expect(stored?.consecutiveFailures).toBe(0)
    expect(stored?.blockedAt ?? null).toBeNull()
  })

  it('never issues a platform fetch without a per-request timeout', async () => {
    // The adapters omit the AbortSignal entirely when the timeout is
    // undefined, so an unset budget means a hung connection on the nightly
    // cron hangs indefinitely.
    const { venue, fetch } = seedPlatformVenue(1)

    await crawlVenue(venue.id, mockBrowser)

    const opts = fetch.mock.calls[0]?.[1]
    expect(opts?.perRequestTimeoutMs).toBeGreaterThan(0)
    expect(opts?.overallTimeoutMs).toBeGreaterThan(0)
  })

  // One venue per test: the in-memory db mock's `where` is a no-op, so a
  // second seeded venue would not be distinguishable from the first.
  it('scales the budget with the adapter’s declared request count', async () => {
    const { venue, fetch } = seedPlatformVenue(50, 3000)

    await crawlVenue(venue.id, mockBrowser)

    const opts = fetch.mock.calls[0]?.[1]
    // 50 requests is 50x the work of AEG's single blob read; a budget that
    // didn't scale with the count would fit one and starve the other.
    expect(opts?.overallTimeoutMs).toBeGreaterThan(
      50 * opts.perRequestTimeoutMs,
    )
  })

  it('leaves room for the crawl delay the venue itself asks for', async () => {
    // 50 pages at a 3s delay is 150s of deliberate pacing before a single
    // response counts. A budget that ignored the delay would fail a healthy
    // venue every night, and a failed run feeds the 3-strikes auto-pause.
    const pages = 50
    const crawlDelayMs = 3000
    const { venue, fetch } = seedPlatformVenue(pages, crawlDelayMs)

    await crawlVenue(venue.id, mockBrowser)

    const opts = fetch.mock.calls[0]?.[1]
    expect(opts?.overallTimeoutMs).toBeGreaterThan(
      pages * (crawlDelayMs + opts.perRequestTimeoutMs),
    )
  })

  it('scales the budget with the venue-configured crawl delay', async () => {
    // A venue asking for unusually polite pacing spends far longer waiting
    // than fetching, so the budget has to follow its own setting rather
    // than a flat constant.
    const crawlDelayMs = 30_000
    const { venue, fetch } = seedPlatformVenue(10, crawlDelayMs)

    await crawlVenue(venue.id, mockBrowser)

    expect(fetch.mock.calls[0]?.[1]?.overallTimeoutMs).toBeGreaterThan(
      10 * crawlDelayMs,
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

  it("paces to the site's Crawl-delay when it is slower than ours", async () => {
    const venue = seedVenue({ crawlMode: 'http', crawlDelayMs: 3_000 })
    vi.mocked(getCrawlDelayMs).mockResolvedValueOnce(10_000)
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalledWith(venue.websiteUrl, 10_000)
  })

  it('ignores a Crawl-delay faster than our own pacing', async () => {
    const venue = seedVenue({ crawlMode: 'http', crawlDelayMs: 3_000 })
    vi.mocked(getCrawlDelayMs).mockResolvedValueOnce(1_000)
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).toHaveBeenCalledWith(venue.websiteUrl, 3_000)
  })

  it('skips the run when the site asks for a Crawl-delay longer than the cap', async () => {
    const venue = seedVenue({ crawlMode: 'http', crawlDelayMs: 3_000 })
    vi.mocked(getCrawlDelayMs).mockResolvedValueOnce(300_000)

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).not.toHaveBeenCalled()
    expect(mockFetchPage).not.toHaveBeenCalled()
    expect(run.status).toBe('skipped')
    expect(run.errorMessage).toContain('Crawl-delay')
  })

  it('skips the run without marking the venue blocked when robots.txt is unreachable', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    vi.mocked(checkRobots).mockResolvedValueOnce({
      status: 'unreachable',
      reason: 'HTTP 503',
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(mockFetchPageHttp).not.toHaveBeenCalled()
    expect(run.status).toBe('skipped')
    expect(run.robotsTxtBlocked).toBe('unchecked')
    expect(run.errorMessage).toContain('robots.txt unreachable')
  })

  it('never sends page text to the LLM when robots.txt closes the site to AI crawlers', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    vi.mocked(isAiUseAllowed).mockResolvedValueOnce(false)
    mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(extractWithLlm).not.toHaveBeenCalled()
    expect(run.status).toBe('failed')
    expect(run.errorMessage).toContain('does not allow AI extraction')
  })

  it('checks the AI signal of the host a redirect lands on, not just the venue site', async () => {
    const venue = seedVenue({ crawlMode: 'http' })
    vi.mocked(isAiUseAllowed).mockImplementation(
      async (url) => !url.startsWith('https://tickets.elsewhere.example'),
    )
    mockFetchPageHttp.mockResolvedValue({
      ...FETCH_RESULT,
      finalUrl: 'https://tickets.elsewhere.example/events',
    })

    const run = await crawlVenue(venue.id, mockBrowser)

    expect(extractWithLlm).not.toHaveBeenCalled()
    expect(run.errorMessage).toContain('does not allow AI extraction')
    vi.mocked(isAiUseAllowed).mockResolvedValue(true)
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

  describe('lazy browser provider (#1352)', () => {
    it('never resolves the provider for a forced-http venue', async () => {
      const venue = seedVenue({ crawlMode: 'http' })
      mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)
      const getBrowser = vi.fn().mockResolvedValue(mockBrowser)

      await crawlVenue(venue.id, getBrowser)

      expect(getBrowser).not.toHaveBeenCalled()
      expect(mockFetchPage).not.toHaveBeenCalled()
    })

    it('resolves the provider for a browser-mode venue', async () => {
      const venue = seedVenue({ crawlMode: 'browser' })
      mockFetchPage.mockResolvedValue(FETCH_RESULT)
      const getBrowser = vi.fn().mockResolvedValue(mockBrowser)

      await crawlVenue(venue.id, getBrowser)

      expect(getBrowser).toHaveBeenCalled()
      expect(mockFetchPage).toHaveBeenCalledWith(
        venue.websiteUrl,
        mockBrowser,
        expect.anything(),
        expect.anything(),
        undefined,
      )
    })

    it('resolves the provider when auto-detect falls back from HTTP to browser', async () => {
      const venue = seedVenue({ crawlMode: null })
      mockFetchPageHttp.mockRejectedValue(new Error('network error'))
      mockFetchPage.mockResolvedValue(FETCH_RESULT)
      const getBrowser = vi.fn().mockResolvedValue(mockBrowser)

      await crawlVenue(venue.id, getBrowser)

      expect(getBrowser).toHaveBeenCalled()
    })

    // The type documents a thunk that launches "on first use", so crawlVenue
    // memoizes it rather than trusting every caller to. A provider written as
    // a bare `() => chromium.launch()` must not be able to launch — and leak —
    // a second browser if a future edit adds another resolve site to the same
    // call.
    it('resolves the provider at most once per crawl', async () => {
      const venue = seedVenue({ crawlMode: null })
      mockFetchPageHttp.mockResolvedValue(FETCH_RESULT)
      mockFetchPage.mockResolvedValue(FETCH_RESULT)
      const getBrowser = vi.fn().mockResolvedValue(mockBrowser)

      await crawlVenue(venue.id, getBrowser)

      expect(getBrowser.mock.calls.length).toBeLessThanOrEqual(1)
    })

    it('retries the provider after a failed launch', async () => {
      const venue = seedVenue({ crawlMode: 'browser' })
      mockFetchPage.mockResolvedValue(FETCH_RESULT)
      const getBrowser = vi
        .fn()
        .mockRejectedValueOnce(new Error('launch failed'))
        .mockResolvedValue(mockBrowser)

      await crawlVenue(venue.id, getBrowser)
      await crawlVenue(venue.id, getBrowser)

      expect(getBrowser).toHaveBeenCalledTimes(2)
      expect(mockFetchPage).toHaveBeenCalled()
    })
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

  // CrawlSelectorTimeoutError renames the underlying Playwright TimeoutError,
  // so without an explicit instanceof branch a browser-mode venue whose
  // selector never resolves would never reach the 3-strikes auto-pause.
  it('sets blockedAt when a selector timeout is the 3rd consecutive failure', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    mockFetchPage.mockRejectedValue(
      new CrawlSelectorTimeoutError(
        '.event-card',
        '<html><body>challenge</body></html>',
        'https://example.com',
        200,
        'page.waitForSelector: Timeout 30000ms exceeded.',
      ),
    )

    const result = await crawlVenue(venue.id, mockBrowser)

    expect(result.status).toBe('failed')
    const savedVenue = stores.venues.find((vv) => vv.id === venue.id)
    expect(savedVenue?.blockedAt).not.toBeNull()
  })

  it('logs the captured html when a selector timeout hits a debug-capture venue', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    mockFetchPage.mockRejectedValue(
      new CrawlSelectorTimeoutError(
        '.event-card',
        '<html><body>challenge page</body></html>',
        'https://example.com/blocked',
        200,
        'page.waitForSelector: Timeout 30000ms exceeded.',
      ),
    )
    const logSpy = vi.spyOn(console, 'log')

    await crawlVenue(venue.id, mockBrowser)

    const captureLines = logSpy.mock.calls
      .map(([line]) => String(line))
      .filter((line) => line.includes('debug.html_capture'))
    expect(captureLines.length).toBeGreaterThan(0)
    expect(captureLines.join('')).toContain('challenge page')

    logSpy.mockRestore()
  })
})

describe('crawlVenue — debug HTML capture', () => {
  function parseCaptureLogs(
    consoleSpy: ReturnType<typeof vi.spyOn<typeof console, 'log'>>,
  ): {
    header: Record<string, unknown> | undefined
    chunks: Record<string, unknown>[]
  } {
    const parsed = consoleSpy.mock.calls
      .map((args) => {
        try {
          return JSON.parse(String(args[0])) as Record<string, unknown>
        } catch {
          return null
        }
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null)
    return {
      header: parsed.find((entry) => entry['event'] === 'debug.html_capture'),
      chunks: parsed.filter(
        (entry) => entry['event'] === 'debug.html_capture.chunk',
      ),
    }
  }

  it('logs a header + chunked HTML to stdout when debugCaptureHtml is true', async () => {
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

      const { header, chunks } = parseCaptureLogs(consoleSpy)
      const expectedChunks = Math.ceil(
        HTML_V1.length / DEBUG_CAPTURE_CHUNK_CHARS,
      )

      expect(header).toBeDefined()
      expect(header).toMatchObject({
        event: 'debug.html_capture',
        venueId: venue.id,
        venueSlug: venue.slug,
        mode: 'browser',
        httpStatus: 200,
        totalLength: HTML_V1.length,
        capturedLength: HTML_V1.length,
        totalChunks: expectedChunks,
        truncated: false,
      })
      expect(header!['captureId']).toMatch(/^[0-9a-f-]{36}$/)
      expect(header!['crawlRunId']).toMatch(/^[0-9a-f-]{36}$/)

      expect(chunks).toHaveLength(expectedChunks)
      const reassembled = chunks
        .slice()
        .sort(
          (aa, bb) => (aa['chunkIdx'] as number) - (bb['chunkIdx'] as number),
        )
        .map((entry) => {
          expect(entry['captureId']).toBe(header!['captureId'])
          expect(entry['totalChunks']).toBe(expectedChunks)
          expect((entry['chunk'] as string).length).toBeLessThanOrEqual(
            DEBUG_CAPTURE_CHUNK_CHARS,
          )
          return entry['chunk'] as string
        })
        .join('')
      expect(reassembled).toBe(HTML_V1)
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

      const { header, chunks } = parseCaptureLogs(consoleSpy)
      expect(header).toBeUndefined()
      expect(chunks).toHaveLength(0)
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('chunks HTML and marks truncated when over the cap', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    // Exceed the cap so we hit the truncated path; exact size doesn't
    // matter beyond > MAX_CHARS.
    const bigHtml =
      '<html><body>' +
      'A'.repeat(DEBUG_CAPTURE_MAX_CHARS + 20_000) +
      '</body></html>'
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

      const { header, chunks } = parseCaptureLogs(consoleSpy)
      const expectedChunks = Math.ceil(
        DEBUG_CAPTURE_MAX_CHARS / DEBUG_CAPTURE_CHUNK_CHARS,
      )

      expect(header).toBeDefined()
      expect(header!['truncated']).toBe(true)
      expect(header!['totalLength']).toBe(bigHtml.length)
      expect(header!['capturedLength']).toBe(DEBUG_CAPTURE_MAX_CHARS)
      expect(header!['totalChunks']).toBe(expectedChunks)

      expect(chunks).toHaveLength(expectedChunks)
      const reassembled = chunks
        .slice()
        .sort(
          (aa, bb) => (aa['chunkIdx'] as number) - (bb['chunkIdx'] as number),
        )
        .map((entry) => {
          expect(entry['captureId']).toBe(header!['captureId'])
          expect(entry['totalChunks']).toBe(expectedChunks)
          expect((entry['chunk'] as string).length).toBeLessThanOrEqual(
            DEBUG_CAPTURE_CHUNK_CHARS,
          )
          return entry['chunk'] as string
        })
        .join('')
      expect(reassembled).toBe(bigHtml.slice(0, DEBUG_CAPTURE_MAX_CHARS))
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('strips inline <style> blocks but keeps <script> payloads', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    const styleBlock = `<style type="text/css">${'.aa{color:red}'.repeat(200)}</style>`
    const scriptBlock =
      '<script id="__NEXT_DATA__" type="application/json">{"props":{"events":[1]}}</script>'
    const styledHtml =
      '<html><head>' +
      styleBlock +
      scriptBlock +
      '</head><body><h1>Metallica</h1></body></html>'
    mockFetchPage.mockResolvedValue({
      html: styledHtml,
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

      const { header, chunks } = parseCaptureLogs(consoleSpy)
      const chunkIdxOf = (entry: Record<string, unknown>): number => {
        const value = entry['chunkIdx']
        expect(typeof value).toBe('number')
        return typeof value === 'number' ? value : -1
      }
      const chunkTextOf = (entry: Record<string, unknown>): string => {
        const value = entry['chunk']
        expect(typeof value).toBe('string')
        return typeof value === 'string' ? value : ''
      }
      const reassembled = chunks
        .slice()
        .sort((aa, bb) => chunkIdxOf(aa) - chunkIdxOf(bb))
        .map(chunkTextOf)
        .join('')

      expect(reassembled).not.toContain('<style')
      expect(reassembled).toContain('<!-- style stripped -->')
      expect(reassembled).toContain(scriptBlock)
      expect(reassembled).toContain('<h1>Metallica</h1>')

      // Original page size is still reported truthfully; strippedLength and
      // capturedLength describe the smaller payload actually emitted.
      expect(header!['totalLength']).toBe(styledHtml.length)
      expect(header!['strippedLength']).toBe(reassembled.length)
      expect(header!['capturedLength']).toBe(reassembled.length)
      expect(header!['strippedLength']).toBeLessThan(styledHtml.length)
      expect(header!['truncated']).toBe(false)
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('avoids truncation when stripping brings a style-heavy page under the cap', async () => {
    const venue = seedVenue({ debugCaptureHtml: true })
    const bigStyledHtml =
      '<html><head><style>' +
      'a{color:red}'.repeat(DEBUG_CAPTURE_MAX_CHARS / 6) +
      '</style></head><body><h1>Metallica</h1></body></html>'
    expect(bigStyledHtml.length).toBeGreaterThan(DEBUG_CAPTURE_MAX_CHARS)
    mockFetchPage.mockResolvedValue({
      html: bigStyledHtml,
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

      const { header, chunks } = parseCaptureLogs(consoleSpy)
      expect(header!['truncated']).toBe(false)
      expect(header!['totalLength']).toBe(bigStyledHtml.length)
      expect(header!['strippedLength']).toBe(
        stripStyleBlocks(bigStyledHtml).length,
      )
      // The whole stripped payload fits, so nothing was capped away even
      // though the original page was over the limit.
      expect(header!['capturedLength']).toBe(
        stripStyleBlocks(bigStyledHtml).length,
      )
      expect(chunks.length).toBe(1)
      expect(chunks[0]!['chunk']).toContain('<h1>Metallica</h1>')
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('stripStyleBlocks handles multiple blocks and leaves markup intact', () => {
    const html =
      '<head><style>a{}</style><style media="print">b{}</style></head><body><p>hi</p></body>'
    expect(stripStyleBlocks(html)).toBe(
      '<head><!-- style stripped --><!-- style stripped --></head><body><p>hi</p></body>',
    )
  })
})

describe('crawlVenue — account-wide LLM quota', () => {
  // The in-memory update() builder Object.assigns the set() payload verbatim
  // and drizzle-orm is not mocked, so a real three-strikes update leaves a
  // Drizzle SQL object in consecutiveFailures. "Still the number 2" is
  // therefore proof no update ran, and the control asserts "no longer 2".
  const QUOTA =
    'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

  const storedVenue = (id: string) => stores.venues.find((row) => row.id === id)
  const arrangeLlmPath = (venue: { websiteUrl: string }) =>
    mockFetchPage.mockResolvedValue({
      html: HTML_V1,
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })

  it('records the run as failed without touching the three-strikes counter', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValueOnce(new Error(QUOTA))

    const run = await crawlVenue(venue.id, mockBrowser)

    // The rejection must actually have been consumed: a crawl that took the
    // JSON-LD or unchanged-hash path would never reach the catch block.
    expect(mockExtractWithLlm).toHaveBeenCalled()
    expect(run.status).toBe('failed')
    expect(storedVenue(venue.id)?.consecutiveFailures).toBe(2)
    expect(storedVenue(venue.id)?.active).toBe(true)
  })

  it('still runs the three-strikes update for an ordinary failure (control)', async () => {
    const venue = seedVenue({ consecutiveFailures: 2 })
    arrangeLlmPath(venue)
    mockExtractWithLlm.mockRejectedValueOnce(
      new Error('TypeError: fetch failed'),
    )

    const run = await crawlVenue(venue.id, mockBrowser)

    // "No longer 2" alone is also true of the success path, which resets the
    // counter to 0, so pin that this was a real failure first.
    expect(mockExtractWithLlm).toHaveBeenCalled()
    expect(run.status).toBe('failed')
    expect(storedVenue(venue.id)?.consecutiveFailures).not.toBe(2)
  })
})
