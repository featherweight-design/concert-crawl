import { describe, it, expect, vi, beforeEach } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { db, events, venues } from '@concert-crawl/db'
import { crawlVenue } from './crawl.js'

// Mock just the IO layer — fetcher, robots, LLM. Real Postgres handles the
// stale-detection mutation paths we're verifying. This file deliberately
// uses the real DB (via the integration vitest config) because the in-memory
// mock in crawl.test.ts applies updates to every row in the store regardless
// of WHERE clause, which masks the per-row filtering behavior the
// stale-detection passes depend on.

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
vi.mock('./lib/email.js', () => ({
  sendCrawlFailureEmail: vi.fn().mockResolvedValue(undefined),
  sendEventCountDropEmail: vi.fn().mockResolvedValue(undefined),
}))

import { fetchPage, fetchPageHttp } from './lib/fetcher.js'
import { extractWithLlm } from './lib/extractors/llm.js'

const mockBrowser = {} as Browser
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

const HTML_BASE = '<html><body><p>Event listing</p></body></html>'
const HTML_BASE_V2 = '<html><body><p>Event listing v2</p></body></html>'

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedTestVenue(): Promise<{ id: string; url: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Stale Detection Test Venue ${crypto.randomUUID()}`,
      slug: `stale-test-${crypto.randomUUID()}`,
      websiteUrl: 'https://stale-test.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
    })
    .returning()
  if (!venue) throw new Error('venue insert returned no row')
  return { id: venue.id, url: venue.websiteUrl }
}

interface ExtractedEvent {
  title: string
  rawTitle: string
  artist: string
  date: string
  doorsTime: string | undefined
  showTime: string | undefined
  ticketUrl: string
  sourceUrl: string
  confidence: number
}

function makeEvent(
  artist: string,
  date: string,
  sourceUrl: string,
): ExtractedEvent {
  const title = `${artist} Live`
  return {
    title,
    // Match what the LLM extractor populates — see issue #826.
    rawTitle: title,
    artist,
    date,
    doorsTime: undefined,
    showTime: undefined,
    ticketUrl: `${sourceUrl}/tickets`,
    sourceUrl,
    confidence: 0.9,
  }
}

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

// Yield via setImmediate up to maxIterations times waiting for `predicate`
// to become true. Used by the #649 await-regression tests to wait for
// execution to actually reach the email call site without using real-time
// sleeps (which were both slow and fragile under load).
async function pollUntil(
  predicate: () => boolean,
  maxIterations = 1000,
): Promise<boolean> {
  for (let idx = 0; idx < maxIterations; idx += 1) {
    if (predicate()) return true
    await new Promise((resolve) => setImmediate(resolve))
  }
  return predicate()
}

beforeEach(async () => {
  await clearCrawlState()
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
})

describe('crawlVenue — stale-event detection (#607)', () => {
  it('refreshes last_seen_at for returned events and marks missing events with first_missing_at', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(14)
    const dateB = futureDate(21)

    // Seed two pre-existing events: A will still be advertised, B will not.
    // last_seen_at is intentionally back-dated so Pass 2's
    // `last_seen_at < startedAt` check identifies B as missing.
    const oldSeenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.insert(events).values([
      {
        venueId: venue.id,
        title: 'Artist A Live',
        artist: 'Artist A',
        canonicalArtist: 'artist a',
        canonicalTitle: 'artist a live',
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
        canonicalArtist: 'artist b',
        canonicalTitle: 'artist b live',
        date: dateB,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
    ])

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [makeEvent('Artist A', dateA, venue.url)],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const beforeCrawl = Date.now()
    const run = await crawlVenue(venue.id, mockBrowser)
    const afterCrawl = Date.now()
    expect(run.status).toBe('success')

    const [rowA] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist A')))
    const [rowB] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist B')))

    expect(rowA?.lastSeenAt).toBeDefined()
    // A was advertised — last_seen_at advanced into the crawl window.
    expect(rowA!.lastSeenAt.getTime()).toBeGreaterThanOrEqual(beforeCrawl)
    expect(rowA!.lastSeenAt.getTime()).toBeLessThanOrEqual(afterCrawl)
    expect(rowA?.firstMissingAt).toBeNull()

    // B was NOT advertised — last_seen_at stayed in the past, and
    // first_missing_at was stamped within the crawl window.
    expect(rowB?.lastSeenAt.getTime()).toBe(oldSeenAt.getTime())
    expect(rowB?.firstMissingAt).not.toBeNull()
    expect(rowB!.firstMissingAt!.getTime()).toBeGreaterThanOrEqual(beforeCrawl)
    expect(rowB!.firstMissingAt!.getTime()).toBeLessThanOrEqual(afterCrawl)
  })

  it('clears first_missing_at when a previously missing event reappears', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(14)
    const dateB = futureDate(21)

    // Crawl 1: extraction returns only A. B will be marked missing.
    const oldSeenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.insert(events).values([
      {
        venueId: venue.id,
        title: 'Artist A Live',
        artist: 'Artist A',
        canonicalArtist: 'artist a',
        canonicalTitle: 'artist a live',
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
        canonicalArtist: 'artist b',
        canonicalTitle: 'artist b live',
        date: dateB,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
    ])

    mockFetchPage.mockResolvedValueOnce({
      html: HTML_BASE,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    mockExtractWithLlm.mockResolvedValueOnce({
      events: [makeEvent('Artist A', dateA, venue.url)],
      usage: { inputTokens: 100, outputTokens: 50 },
    })
    await crawlVenue(venue.id, mockBrowser)

    const [rowBAfterFirst] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist B')))
    expect(rowBAfterFirst?.firstMissingAt).not.toBeNull()

    // Crawl 2: extraction now returns A AND B (B reappeared on the page).
    // Use a fresh HTML so the page-hash skip path doesn't fire.
    mockFetchPage.mockResolvedValueOnce({
      html: HTML_BASE_V2,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    mockExtractWithLlm.mockResolvedValueOnce({
      events: [
        makeEvent('Artist A', dateA, venue.url),
        makeEvent('Artist B', dateB, venue.url),
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })
    const beforeSecondCrawl = Date.now()
    await crawlVenue(venue.id, mockBrowser)

    const [rowBAfterSecond] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist B')))

    expect(rowBAfterSecond?.firstMissingAt).toBeNull()
    expect(rowBAfterSecond?.lastSeenAt).toBeDefined()
    expect(rowBAfterSecond!.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
      beforeSecondCrawl,
    )
  })

  it('does not touch first_missing_at when the crawl errors out', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(14)
    const dateB = futureDate(21)

    const oldSeenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.insert(events).values([
      {
        venueId: venue.id,
        title: 'Artist A Live',
        artist: 'Artist A',
        canonicalArtist: 'artist a',
        canonicalTitle: 'artist a live',
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
        canonicalArtist: 'artist b',
        canonicalTitle: 'artist b live',
        date: dateB,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
    ])

    // Simulate a hard fetch failure — crawl never reaches extraction.
    mockFetchPage.mockRejectedValue(new Error('network unreachable'))
    mockFetchPageHttp.mockRejectedValue(new Error('network unreachable'))

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('failed')

    const [rowA] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist A')))
    const [rowB] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist B')))

    // Critical: a failed crawl must NEVER mark events stale, otherwise a
    // single bad day at the venue (DNS hiccup, transient 5xx) would flag
    // every event for admin review.
    expect(rowA?.firstMissingAt).toBeNull()
    expect(rowB?.firstMissingAt).toBeNull()
    expect(rowA?.lastSeenAt.getTime()).toBe(oldSeenAt.getTime())
    expect(rowB?.lastSeenAt.getTime()).toBe(oldSeenAt.getTime())
  })

  it('does not stamp first_missing_at when a successful crawl returns zero events', async () => {
    // Regression for the Red Rocks incident: a successful HTTP fetch whose
    // extraction returns zero events (bot-detected DOM, JS-repopulated grid,
    // LLM whiff) must NOT wipe the venue's entire catalog. Pass 2 stamps
    // first_missing_at on every unseen upcoming future event; with zero
    // events seen, that would hide the whole calendar in one crawl —
    // exactly what took the spotlight venue dark. The guard mirrors Pass 1:
    // no seen events → touch nothing, and let the #624 went-dark alert flag
    // it for a human instead.
    const venue = await seedTestVenue()
    const dateA = futureDate(14)
    const dateB = futureDate(21)

    const oldSeenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.insert(events).values([
      {
        venueId: venue.id,
        title: 'Artist A Live',
        artist: 'Artist A',
        canonicalArtist: 'artist a',
        canonicalTitle: 'artist a live',
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
        canonicalArtist: 'artist b',
        canonicalTitle: 'artist b live',
        date: dateB,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
    ])

    // Fetch succeeds, extraction returns nothing — the incident's shape.
    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')
    expect(run.eventsFound).toBe(0)

    const [rowA] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist A')))
    const [rowB] = await db
      .select()
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.artist, 'Artist B')))

    // Neither event may be flagged stale — a zero-event crawl is treated as
    // "we learned nothing", not "everything is gone". last_seen_at also
    // stays put because Pass 1 is skipped when no events were seen.
    expect(rowA?.firstMissingAt).toBeNull()
    expect(rowB?.firstMissingAt).toBeNull()
    expect(rowA?.lastSeenAt.getTime()).toBe(oldSeenAt.getTime())
    expect(rowB?.lastSeenAt.getTime()).toBe(oldSeenAt.getTime())
  })
})

describe('crawlVenue — canonical-title upsert key (#821)', () => {
  it('matches existing rows by canonical_title so LLM artist-substring drift across crawls collapses to one row', async () => {
    // Regression test for issue #821: prod had 47% dupe rate on hidden
    // events because the LLM extracted non-deterministic artist substrings
    // from compound titles across crawl runs. Example from prod (Larimer
    // 7/31): "BPM BINGO! Dombresky / Walker & Royce Edition" produced six
    // rows under canonical_artist dedup because each crawl picked a
    // different artist substring (BPM BINGO! / BPM BINGO / Dombresky /
    // Dombresky / Walker & Royce / Dombresky, Walker & Royce / ...).
    //
    // Post-#821: the canonical_title key on the upsert + the partial
    // UNIQUE index in 0044 collapse all artist-substring variants of the
    // same listing to a single row.
    const venue = await seedTestVenue()
    const showDate = futureDate(14)

    const oldSeenAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.insert(events).values({
      venueId: venue.id,
      title: 'BPM BINGO! Dombresky / Walker & Royce Edition',
      artist: 'BPM BINGO!',
      canonicalArtist: 'bpm bingo!',
      canonicalTitle: 'bpm bingo! dombresky / walker & royce edition',
      date: showDate,
      status: 'upcoming',
      lastSeenAt: oldSeenAt,
      firstMissingAt: null,
    })

    // Re-crawl extracts the same listing but the LLM picks a different
    // artist substring — what produced the prod dupes.
    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'BPM BINGO! Dombresky / Walker & Royce Edition',
          rawTitle: 'BPM BINGO! Dombresky / Walker & Royce Edition',
          artist: 'Dombresky',
          date: showDate,
          confidence: 0.9,
          sourceUrl: venue.url,
        },
      ],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const beforeCrawl = Date.now()
    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')

    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.venueId, venue.id),
          eq(
            events.canonicalTitle,
            'bpm bingo! dombresky / walker & royce edition',
          ),
        ),
      )

    // ONE row, not two — the partial UNIQUE index and the canonical-title
    // upsert key collapse "Dombresky" → existing "BPM BINGO!" row.
    expect(rows).toHaveLength(1)

    // Pass 1 found the row by canonical_title — last_seen_at advanced and
    // first_missing_at stayed NULL. Without the canonical-title match this
    // would re-flag the row as missing on every extraction that chose a
    // different artist substring.
    expect(rows[0]!.lastSeenAt.getTime()).toBeGreaterThanOrEqual(beforeCrawl)
    expect(rows[0]!.firstMissingAt).toBeNull()

    // The artist field intentionally stays at the original "BPM BINGO!"
    // form — the ON CONFLICT SET clause doesn't update artist so it
    // doesn't flip between extractions.
    expect(rows[0]!.artist).toBe('BPM BINGO!')

    // canonical_artist DOES update on re-crawl — the set clause includes
    // it so the column tracks the most recent LLM artist-substring choice
    // (#821 contract). This pins that intended drift-tracking behavior;
    // without the set clause this would still read 'bpm bingo!'.
    expect(rows[0]!.canonicalArtist).toBe('dombresky')
  })
})

describe('crawlVenue — email await regression (#649)', () => {
  it('awaits sendCrawlFailureEmail before returning on the 3rd consecutive failure', async () => {
    // Locks in #649: the crawler runs as a Render cron that hard-exits via
    // process.exit(0); a fire-and-forget email Promise gets severed before
    // completion. This installs a deferred mock and asserts crawlVenue does
    // not resolve while the email Promise is pending.
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    mockSendEmail.mockReset()

    // Seed venue at consecutiveFailures: 2 so the next failure makes it 3.
    // crawlMode: 'browser' forces fetchPage (the mock we control) instead
    // of the HTTP-first auto-detect path that would use fetchPageHttp.
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Email Await Test ${crypto.randomUUID()}`,
        slug: `email-await-${crypto.randomUUID()}`,
        websiteUrl: 'https://email-await-test.example.com',
        consecutiveFailures: 2,
        crawlMode: 'browser',
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')

    mockFetchPage.mockRejectedValue(new Error('boom'))

    let resolveEmail: () => void = () => {}
    const emailPromise = new Promise<void>((resolve) => {
      resolveEmail = resolve
    })
    mockSendEmail.mockImplementationOnce(() => emailPromise)

    const crawlPromise = crawlVenue(venue.id, mockBrowser)
    let settled = false
    void crawlPromise.then(() => {
      settled = true
    })

    // Poll until execution has actually reached the email call site (mock
    // invoked). This isolates the await as what's blocking the outer
    // Promise — without this gate, the test could pass on slow upstream DB
    // work alone, even if the email weren't actually awaited.
    const reached = await pollUntil(() => mockSendEmail.mock.calls.length === 1)
    expect(reached).toBe(true)

    // Yield once more so any synchronous continuation past the email call
    // (if the await were missing) would have had a chance to settle the
    // outer Promise. settled MUST still be false because the email Promise
    // is still pending.
    await new Promise((resolve) => setImmediate(resolve))
    expect(settled).toBe(false)

    resolveEmail()
    const result = await crawlPromise
    expect(result.status).toBe('failed')
  })

  it('catches sendCrawlFailureEmail rejection without flipping the crawl_run status', async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    mockSendEmail.mockReset()

    const [venue] = await db
      .insert(venues)
      .values({
        name: `Email Reject Test ${crypto.randomUUID()}`,
        slug: `email-reject-${crypto.randomUUID()}`,
        websiteUrl: 'https://email-reject-test.example.com',
        consecutiveFailures: 2,
        crawlMode: 'browser',
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')

    mockFetchPage.mockRejectedValue(new Error('boom'))
    mockSendEmail.mockRejectedValueOnce(new Error('resend 500'))
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    try {
      const result = await crawlVenue(venue.id, mockBrowser)
      expect(result.status).toBe('failed')

      const errorLog = logSpy.mock.calls
        .map((args) => String(args[0]))
        .find((line) => line.includes('crawl.email_error'))
      expect(errorLog).toBeDefined()
      expect(errorLog).toContain('resend 500')
    } finally {
      logSpy.mockRestore()
    }
  })
})

describe('crawlVenue — per-platform fetcher dispatch (#623)', () => {
  it('routes AEG-configured venues to the platform fetcher and writes a platform:aeg crawl_run', async () => {
    // Seed a venue marked platform='aeg'. Then stub global fetch (which the
    // AEG adapter uses) to return a minimal valid AEG response. crawlVenue
    // should skip the fetchPage/LLM path entirely and record the result
    // with extraction_strategy_used = 'platform:aeg'.
    const [venue] = await db
      .insert(venues)
      .values({
        name: `AEG Platform Test ${crypto.randomUUID()}`,
        slug: `aeg-platform-${crypto.randomUUID()}`,
        websiteUrl: 'https://aeg-platform-test.example.com',
        platform: 'aeg',
        platformVenueId: '2',
        crawlMode: 'browser',
        crawlDelayMs: 0,
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')

    // Minimal AEG payload — one valid event matching the adapter's schema.
    const aegPayload = {
      meta: { total: 1 },
      events: [
        {
          eventId: 'evt-001',
          active: true,
          publishStatus: 1,
          title: {
            headlinersText: 'Test Headliner',
            supportingText: null,
            tour: null,
            eventTitleText: 'Test Show',
          },
          eventDateTimeISO: '2027-08-15T20:00:00-06:00',
          doorDateTime: '2027-08-15T19:00:00',
          ticketing: {
            url: 'https://example.com/buy',
            ticketURL: 'https://example.com/buy',
          },
        },
      ],
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(aegPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response,
    )

    try {
      const run = await crawlVenue(venue.id, mockBrowser)
      expect(run.status).toBe('success')
      expect(run.extractionStrategyUsed).toBe('platform:aeg')
      expect(run.eventsFound).toBe(1)
      expect(run.httpStatusCode).toBeNull() // platform path doesn't record HTTP status
      expect(run.pageHash).toBeNull() // platform path doesn't compute pageHash

      // fetchPage / fetchPageHttp must NOT have been called — the platform
      // path skips the entire HTML retrieval stage.
      expect(mockFetchPage).not.toHaveBeenCalled()
      expect(mockFetchPageHttp).not.toHaveBeenCalled()

      // The AEG blob URL was hit instead.
      expect(fetchSpy).toHaveBeenCalledOnce()
      const calledUrl = String(fetchSpy.mock.calls[0]![0])
      expect(calledUrl).toContain('aegwebprod.blob.core.windows.net')
      expect(calledUrl).toContain('/json/events/2/events.json')

      // The event landed in the events table with platform-fetched data.
      const [eventRow] = await db
        .select()
        .from(events)
        .where(eq(events.venueId, venue.id))
      expect(eventRow).toBeDefined()
      expect(eventRow!.artist).toBe('Test Headliner')
      expect(eventRow!.date).toBe('2027-08-15')
      expect(eventRow!.confidenceScore).toBe('1.00')
      // sourceUrl is the venue's website (matches the LLM path's convention)
      expect(eventRow!.sourceUrl).toBe(venue.websiteUrl)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('does not auto-set crawlMode for a null-crawlMode venue on the platform path', async () => {
    // Regression for Copilot review on #662: the auto-detect crawlMode
    // write (which flips null → 'browser' on the first crawl) is intended
    // for the HTML path only. On the platform path we didn't actually
    // probe HTTP vs browser, so writing 'browser' here would silently
    // lose auto-detect if the operator later clears venue.platform.
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Platform CrawlMode Test ${crypto.randomUUID()}`,
        slug: `platform-crawlmode-${crypto.randomUUID()}`,
        websiteUrl: 'https://platform-crawlmode-test.example.com',
        platform: 'aeg',
        platformVenueId: '2',
        crawlMode: null, // intentionally null
        crawlDelayMs: 0,
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')

    const aegPayload = {
      meta: { total: 0 },
      events: [],
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(aegPayload), { status: 200 }) as Response,
      )

    try {
      await crawlVenue(venue.id, mockBrowser)
      const [updatedVenue] = await db
        .select({ crawlMode: venues.crawlMode })
        .from(venues)
        .where(eq(venues.id, venue.id))
      expect(updatedVenue!.crawlMode).toBeNull()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('falls through to the existing HTML path when venue.platform is null', async () => {
    // Sanity check that non-platform venues still hit fetchPage.
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Non-Platform Test ${crypto.randomUUID()}`,
        slug: `non-platform-${crypto.randomUUID()}`,
        websiteUrl: 'https://non-platform-test.example.com',
        platform: null,
        crawlMode: 'browser',
        crawlDelayMs: 0,
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')

    mockFetchPage.mockResolvedValue({
      html: '<html><body></body></html>',
      httpStatus: 200,
      finalUrl: venue.websiteUrl,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    })

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')
    expect(run.extractionStrategyUsed).toBe('llm')
    expect(mockFetchPage).toHaveBeenCalled()
  })
})

describe('crawlVenue — non-concert auto-classification (#696)', () => {
  it('INSERT path sets hidden_from_consumer=true when LLM returns isConcert=false', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'BASS BINGO – Wooli Edition!',
          artist: 'Wooli',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: false,
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        hiddenFromConsumer: events.hiddenFromConsumer,
        artist: events.artist,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(true)
    expect(row?.artist).toBe('Wooli')
  })

  it('INSERT path sets hidden_from_consumer=false when LLM returns isConcert=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Wynonna Judd Live',
          artist: 'Wynonna Judd',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true,
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({ hiddenFromConsumer: events.hiddenFromConsumer })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(false)
  })

  it('INSERT path defaults to hidden_from_consumer=false when LLM omits isConcert (fail-open)', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Ambiguous Show',
          artist: 'Ambiguous Artist',
          date: dateA,
          confidence: 0.8,
          sourceUrl: venue.url,
          // isConcert intentionally undefined
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({ hiddenFromConsumer: events.hiddenFromConsumer })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(false)
  })

  it('UPDATE path does NOT overwrite admin-set hidden_from_consumer=true even when LLM says isConcert=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    // Seed an event with admin-overridden hidden_from_consumer=true.
    // Crawler re-extracts the same event with isConcert=true; should leave
    // the admin decision in place.
    await db.insert(events).values({
      venueId: venue.id,
      title: 'Originally Misclassified Show',
      artist: 'Test Artist',
      canonicalArtist: 'test artist',
      canonicalTitle: 'originally misclassified show',
      date: dateA,
      status: 'upcoming',
      hiddenFromConsumer: true,
      sourceHash: 'old-hash',
    })

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE_V2, // different from any prior to bypass page-hash skip
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          // Title differs by case/whitespace only — canonicalizeTitle()
          // collapses both to "originally misclassified show", so the
          // upsert hits the UPDATE branch (where the hidden_from_consumer
          // preservation rule lives). This exercises the "raw title
          // changes without canonical_title changing" case: the stored
          // title should adopt the new variant while admin overrides stay
          // sticky. artist also deliberately different to mirror the
          // real-world LLM artist-substring drift.
          title: 'ORIGINALLY  Misclassified Show',
          rawTitle: 'ORIGINALLY  Misclassified Show',
          artist: 'Test Artist Featured',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true, // LLM disagrees with admin
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        hiddenFromConsumer: events.hiddenFromConsumer,
        title: events.title,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    // Admin override sticks across re-crawl — the UPDATE branch's `set`
    // clause does not include hidden_from_consumer.
    expect(row?.hiddenFromConsumer).toBe(true)
    // Raw title updates to the new variant — title IS in the set clause,
    // and minor case/whitespace drift is normal across crawl runs.
    expect(row?.title).toBe('ORIGINALLY  Misclassified Show')
  })

  it('INSERT path sets is_concert_review_needed=true when LLM returns reviewNeeded=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'PRESIDENT: North American Campaign 2026',
          artist: 'PRESIDENT',
          date: dateA,
          confidence: 0.7,
          sourceUrl: venue.url,
          isConcert: false,
          reviewNeeded: true,
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.hiddenFromConsumer).toBe(true)
    expect(row?.isConcertReviewNeeded).toBe(true)
  })

  it('INSERT path defaults is_concert_review_needed=false when LLM omits reviewNeeded', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          title: 'Wynonna Judd Live',
          artist: 'Wynonna Judd',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true,
          // reviewNeeded intentionally undefined
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({ isConcertReviewNeeded: events.isConcertReviewNeeded })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.isConcertReviewNeeded).toBe(false)
  })

  it('UPDATE path leaves is_concert_review_needed alone (crawler-frozen)', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(7)

    // Seed an event with is_concert_review_needed=true (as if from a prior
    // crawl). Re-crawl with reviewNeeded=false; column should stay true.
    await db.insert(events).values({
      venueId: venue.id,
      title: 'Borderline Show',
      artist: 'Borderline Artist',
      canonicalArtist: 'borderline artist',
      canonicalTitle: 'borderline show',
      date: dateA,
      status: 'upcoming',
      isConcertReviewNeeded: true,
      sourceHash: 'old-hash',
    })

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE_V2,
      finalUrl: venue.url,
      httpStatus: 200,
    })
    mockExtractWithLlm.mockResolvedValue({
      events: [
        {
          // Title differs by case/whitespace only — canonicalizeTitle()
          // collapses both to "borderline show", so the upsert hits the
          // UPDATE branch (where the isConcertReviewNeeded preservation
          // rule lives). Exercises the "raw title changes without
          // canonical_title changing" case alongside the crawler-frozen
          // assertion below.
          title: '  Borderline SHOW  ',
          rawTitle: '  Borderline SHOW  ',
          artist: 'Borderline Artist',
          date: dateA,
          confidence: 0.95,
          sourceUrl: venue.url,
          isConcert: true,
          reviewNeeded: false, // LLM now confident
        },
      ],
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    })

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        title: events.title,
      })
      .from(events)
      .where(eq(events.venueId, venue.id))

    expect(row?.isConcertReviewNeeded).toBe(true) // crawler-frozen
    // Raw title updates to the new case/whitespace variant — title IS in
    // the UPDATE branch's set clause, and minor drift is normal.
    expect(row?.title).toBe('  Borderline SHOW  ')
  })
})

describe('crawlVenue — auto-pause at threshold (#743)', () => {
  async function seedVenueWithCount(
    consecutiveFailures: number,
    active = true,
  ): Promise<{ id: string; name: string; url: string }> {
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Auto-pause Test ${crypto.randomUUID()}`,
        slug: `auto-pause-${crypto.randomUUID()}`,
        websiteUrl: 'https://auto-pause-test.example.com',
        city: 'Denver',
        timezone: 'America/Denver',
        active,
        verified: true,
        crawlMode: 'browser',
        consecutiveFailures,
      })
      .returning()
    if (!venue) throw new Error('venue insert returned no row')
    return { id: venue.id, name: venue.name, url: venue.websiteUrl }
  }

  beforeEach(async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    vi.mocked(sendCrawlFailureEmail).mockReset()
    vi.mocked(sendCrawlFailureEmail).mockResolvedValue(undefined)
  })

  it('auto-pauses the venue on the 3rd consecutive failure', async () => {
    const venue = await seedVenueWithCount(2)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        active: venues.active,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(3)
    expect(row?.active).toBe(false)
  })

  it('does not auto-pause before the 3rd consecutive failure', async () => {
    const venue = await seedVenueWithCount(1)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        active: venues.active,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(2)
    expect(row?.active).toBe(true)
  })

  it('does not re-pause a venue an admin has re-activated (count goes 3 → 4)', async () => {
    // Admin manually un-paused after the initial auto-pause. The venue's
    // bug hasn't been fixed yet, so the next crawl still fails. The CASE
    // guard in the UPDATE must NOT flip `active` back to false (otherwise
    // the auto-pause would fight every admin re-activation indefinitely).
    const venue = await seedVenueWithCount(3, true)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        active: venues.active,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(4)
    expect(row?.active).toBe(true)
  })

  it('sends the crawl-failure email exactly once, at the 3rd failure', async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    const venue = await seedVenueWithCount(2)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith({
      venueName: venue.name,
      venueId: venue.id,
      consecutiveFailures: 3,
    })
  })

  it('does not re-send the email on subsequent failures', async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    const venue = await seedVenueWithCount(3, true)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('notification body indicates auto-pause on the 3rd failure', async () => {
    const venue = await seedVenueWithCount(2)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    const { notifications } = await import('@concert-crawl/db')
    const rows = await db
      .select({ body: notifications.body, category: notifications.category })
      .from(notifications)
      .where(eq(notifications.category, 'crawl.failed'))
    expect(rows.length).toBe(1)
    expect(String(rows[0]?.body)).toMatch(/auto-paused/i)
  })

  it('notification body does NOT mention auto-pause on subsequent failures', async () => {
    const venue = await seedVenueWithCount(3, true)
    mockFetchPage.mockRejectedValue(new Error('generic schema error'))

    await crawlVenue(venue.id, mockBrowser)

    const { notifications } = await import('@concert-crawl/db')
    const rows = await db
      .select({ body: notifications.body, category: notifications.category })
      .from(notifications)
      .where(eq(notifications.category, 'crawl.failed'))
    expect(rows.length).toBe(1)
    expect(String(rows[0]?.body)).not.toMatch(/auto-paused/i)
  })

  it('fires the email exactly once when two concurrent crawls hit the threshold simultaneously', async () => {
    // The concrete race Copilot caught on PR #746: two workers (daily +
    // triggers cron) both read consecutiveFailures=2, both fail to fetch.
    // Without the SQL increment + CASE, both would compute
    // newFailureCount=3 and both would fire the auto-pause flip + the
    // crawl-failure email + the "auto-paused"-wording notification. With
    // the atomic UPDATE + RETURNING, exactly one worker sees the row land
    // on 3 (the other sees 4) and fires those threshold-only side-effects
    // once. The plain crawl.failed notification still inserts on both
    // workers — that's intentional re-alerting and is exercised by the
    // assertions below (two notifications, only one with "auto-paused").
    //
    // We deliberately use a deferred-rejection mock so both workers reach
    // the failure path *together*. Using mockRejectedValue would let worker
    // A's failure path commit (including the auto-pause that flips active
    // to false) before worker B's initial venue SELECT — which would throw
    // "venue not active" on B and never reach the race.
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    const venue = await seedVenueWithCount(2)

    // 50ms delay before the throw guarantees both workers complete their
    // initial venue SELECT (where active=true) before either reaches the
    // failure path. Without this, A's mockRejectedValue would synchronously
    // fail in the same microtask cycle, letting A's UPDATE (which flips
    // active to false) commit before B's SELECT even runs — and B would
    // throw `Venue ${venueId} not found or not active/verified`
    // (crawl.ts:196) instead of racing through the threshold.
    mockFetchPage.mockImplementation(
      () =>
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('generic schema error')), 50),
        ),
    )

    await Promise.all([
      crawlVenue(venue.id, mockBrowser),
      crawlVenue(venue.id, mockBrowser),
    ])

    const [row] = await db
      .select({
        active: venues.active,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(4)
    expect(row?.active).toBe(false)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith({
      venueName: venue.name,
      venueId: venue.id,
      consecutiveFailures: 3,
    })

    const { notifications } = await import('@concert-crawl/db')
    const noteRows = await db
      .select({ body: notifications.body })
      .from(notifications)
      .where(eq(notifications.category, 'crawl.failed'))
    expect(noteRows.length).toBe(2)
    const autoPausedNotes = noteRows.filter((rr) =>
      /auto-paused/i.test(String(rr.body)),
    )
    expect(autoPausedNotes.length).toBe(1)
  })

  // Block vs auto-pause are separate signals — see crawl.ts failure-path
  // comment. These tests pin the boundary so a future refactor can't
  // re-conflate them. Regression coverage for Copilot's round-3 review on
  // PR #746.
  it('does NOT auto-pause when the 3rd failure is an HTTP block (403)', async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    const venue = await seedVenueWithCount(2)

    // CrawlFetchError with httpStatus 403 = isHttpBlocked = isBlocked.
    const { CrawlFetchError } = await import('./lib/fetcher.js')
    mockFetchPage.mockRejectedValue(new CrawlFetchError(403, 'Forbidden'))

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        active: venues.active,
        blockedAt: venues.blockedAt,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(3)
    // The fix: a 403 at the 3rd consecutive failure sets blockedAt but
    // leaves `active` alone, so the admin trigger endpoint still accepts
    // a recovery trigger without an extra un-pause step.
    expect(row?.active).toBe(true)
    expect(row?.blockedAt).not.toBeNull()
    expect(mockSendEmail).not.toHaveBeenCalled()

    const { notifications } = await import('@concert-crawl/db')
    const noteRows = await db
      .select({ body: notifications.body })
      .from(notifications)
      .where(eq(notifications.category, 'crawl.failed'))
    expect(noteRows.length).toBe(1)
    expect(String(noteRows[0]?.body)).not.toMatch(/auto-paused/i)
  })

  it('does NOT auto-pause when the 3rd failure is a TimeoutError', async () => {
    const { sendCrawlFailureEmail } = await import('./lib/email.js')
    const mockSendEmail = vi.mocked(sendCrawlFailureEmail)
    const venue = await seedVenueWithCount(2)

    // TimeoutError + consecutiveFailures >= 2 = isTimeoutBlock = isBlocked.
    const timeoutError = new Error('Timeout exceeded')
    timeoutError.name = 'TimeoutError'
    mockFetchPage.mockRejectedValue(timeoutError)

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select({
        active: venues.active,
        blockedAt: venues.blockedAt,
        consecutiveFailures: venues.consecutiveFailures,
      })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.consecutiveFailures).toBe(3)
    expect(row?.active).toBe(true)
    expect(row?.blockedAt).not.toBeNull()
    expect(mockSendEmail).not.toHaveBeenCalled()

    const { notifications } = await import('@concert-crawl/db')
    const noteRows = await db
      .select({ body: notifications.body })
      .from(notifications)
      .where(eq(notifications.category, 'crawl.failed'))
    expect(noteRows.length).toBe(1)
    expect(String(noteRows[0]?.body)).not.toMatch(/auto-paused/i)
  })
})

describe('crawlVenue — force reprocess', () => {
  it('re-upserts an unchanged event to backfill supportingArtists only when force=true', async () => {
    const venue = await seedTestVenue()
    const dateA = futureDate(30)
    const baseEvent = makeEvent('Reprocess Artist', dateA, venue.url)

    mockFetchPage.mockResolvedValue({
      html: HTML_BASE,
      httpStatus: 200,
      finalUrl: venue.url,
    })
    // First crawl persists the event with no openers (legacy shape).
    mockExtractWithLlm.mockResolvedValue({
      events: [baseEvent],
      usage: { inputTokens: 100, outputTokens: 50 },
    })
    const first = await crawlVenue(venue.id, mockBrowser)
    expect(first.status).toBe('success')

    // Force the row into the pre-fix legacy state: null openers.
    await db
      .update(events)
      .set({ supportingArtists: null })
      .where(eq(events.venueId, venue.id))

    // The extractor now yields the SAME event (identical title/date/times, so
    // the source hash is unchanged; identical HTML, so the page hash is
    // unchanged) but with openers present.
    mockExtractWithLlm.mockResolvedValue({
      events: [{ ...baseEvent, supportingArtists: ['Opener One'] }],
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    // A normal re-crawl hits the venue-level page-hash skip and never
    // re-extracts, so the legacy null stays put.
    const skipped = await crawlVenue(venue.id, mockBrowser)
    expect(skipped.status).toBe('skipped')
    const [afterSkip] = await db
      .select({ supportingArtists: events.supportingArtists })
      .from(events)
      .where(eq(events.venueId, venue.id))
    expect(afterSkip?.supportingArtists).toBeNull()

    // A forced re-crawl bypasses both skips and re-upserts, backfilling the
    // openers even though nothing in the hashed fields changed.
    const forced = await crawlVenue(venue.id, mockBrowser, undefined, [], true)
    expect(forced.status).not.toBe('skipped')
    const [afterForce] = await db
      .select({ supportingArtists: events.supportingArtists })
      .from(events)
      .where(eq(events.venueId, venue.id))
    expect(afterForce?.supportingArtists).toEqual(['Opener One'])
  })
})
