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
  return {
    title: `${artist} Live`,
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
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
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
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
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
        date: dateA,
        status: 'upcoming',
        lastSeenAt: oldSeenAt,
        firstMissingAt: null,
      },
      {
        venueId: venue.id,
        title: 'Artist B Live',
        artist: 'Artist B',
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
})
