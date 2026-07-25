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

import {
  crawlVenue,
  DEBUG_CAPTURE_CHUNK_CHARS,
  DEBUG_CAPTURE_MAX_CHARS,
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
  // rawTitle mirrors the LLM-stripped title since this is a unit-test
  // fixture; the cross-venue presale filter (#826) cares about
  // pre-strip listing decoration we don't simulate here.
  rawTitle: 'Metallica Live',
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
          supportingArtists: ['MIKE', 'Niontay & Friends', 'MIKE'],
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

  it('does NOT skip when no candidates are provided (default empty list)', async () => {
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
          ticketUrl: 'https://cervantes.example.com/tickets',
          sourceUrl: sourceVenue.websiteUrl,
          confidence: 0.9,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    // Don't pass candidates → defaults to [] → filter is a no-op.
    const run = await crawlVenue(sourceVenue.id, mockBrowser)

    expect(run.status).toBe('success')
    expect(run.eventsInserted).toBe(1)
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
})
