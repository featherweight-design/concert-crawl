import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { db, events, venues } from '@concert-crawl/db'
import { crawlVenue } from './crawl.js'

// #992 — `tour_name` is admin-editable. It is only ever populated by the LLM
// extractor (schema.org JSON-LD has no tour-name field), so a JSON-LD re-crawl
// always arrives with NULL. The upsert must therefore COALESCE rather than take
// excluded.tour_name wholesale, or the nightly crawl would wipe an admin's
// manual entry.
//
// Same IO-layer mocking as crawl-headliners.integration.test.ts: real Postgres,
// mocked fetcher / robots / LLM.

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

// The seeded venue is HTTP-mode, so crawlVenue never resolves the browser
// source. Throwing here turns any future change that does reach for a browser
// into a loud failure rather than a silent `{}` masquerading as a Browser.
const mockBrowser = (): Promise<Browser> => {
  throw new Error('browser must not be launched in an HTTP-mode crawl')
}
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

const SOURCE_URL = 'https://tourname.example.com'
const HTML_BASE = '<html><body><p>Tour listing</p></body></html>'

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, artists, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedTestVenue(): Promise<{ id: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Tour Venue ${crypto.randomUUID()}`,
      slug: `tour-venue-${crypto.randomUUID()}`,
      websiteUrl: SOURCE_URL,
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'http',
    })
    .returning()
  if (!venue) throw new Error('venue insert returned no row')
  return { id: venue.id }
}

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

interface ExtractedEvent {
  title: string
  rawTitle: string
  artist: string
  tourName?: string
  date: string
  sourceUrl: string
  confidence: number
}

function makeEvent(
  artist: string,
  date: string,
  extra: Partial<ExtractedEvent> = {},
): ExtractedEvent {
  const title = `${artist} Live`
  return {
    title,
    rawTitle: title,
    artist,
    date,
    sourceUrl: SOURCE_URL,
    confidence: 0.9,
    ...extra,
  }
}

// `html` must differ between two crawls of the same venue: crawlVenue
// short-circuits to status 'skipped' when the page hash is unchanged.
function mockExtraction(extracted: ExtractedEvent[], html = HTML_BASE): void {
  mockFetchPage.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: SOURCE_URL,
  })
  mockFetchPageHttp.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: SOURCE_URL,
  })
  mockExtractWithLlm.mockResolvedValue({
    events: extracted,
    usage: { inputTokens: 0, outputTokens: 0 },
  })
}

// The upsert is gated on the per-event source hash (title + date + times), so
// a re-crawl has to change the title to actually rewrite the stored row.
function retitled(event: ExtractedEvent, title: string): ExtractedEvent {
  return { ...event, title, rawTitle: title }
}

async function loadTourName(artist: string): Promise<string | null> {
  const [row] = await db
    .select({ tourName: events.tourName })
    .from(events)
    .where(eq(events.artist, artist))
  if (!row) throw new Error(`no events row for artist "${artist}"`)
  return row.tourName
}

async function setTourNameAsAdmin(
  artist: string,
  tourName: string | null,
): Promise<void> {
  await db.update(events).set({ tourName }).where(eq(events.artist, artist))
}

beforeEach(async () => {
  await clearCrawlState()
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
})

describe('crawlVenue — admin tour_name preservation (#992)', () => {
  it('preserves an admin-set tour name when a re-crawl that DOES touch the row carries none', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(20)

    // First crawl: no tour name at all (the JSON-LD-shaped case).
    mockExtraction([makeEvent('Khruangbin', date)])
    const first = await crawlVenue(venue.id, mockBrowser)
    expect(first.status).toBe('success')
    expect(await loadTourName('Khruangbin')).toBeNull()

    // Admin fills it in by hand via the event editor.
    await setTourNameAsAdmin('Khruangbin', 'A LA SALA Tour')

    // Nightly re-crawl. The title change moves the source hash, so this row
    // genuinely reaches the upsert rather than being filtered out by the
    // unchanged-hash gate — without the COALESCE the admin's entry would be
    // overwritten with the extraction's NULL right here.
    mockExtraction(
      [retitled(makeEvent('Khruangbin', date), 'Khruangbin (Late Show)')],
      `${HTML_BASE}<!-- 2 -->`,
    )
    const second = await crawlVenue(venue.id, mockBrowser)
    expect(second.status).toBe('success')

    expect(await loadTourName('Khruangbin')).toBe('A LA SALA Tour')
  })

  it('lets a freshly extracted tour name win over the stored value', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(21)

    mockExtraction([makeEvent('Big Thief', date, { tourName: 'Old Tour' })])
    await crawlVenue(venue.id, mockBrowser)
    expect(await loadTourName('Big Thief')).toBe('Old Tour')

    mockExtraction(
      [
        retitled(
          makeEvent('Big Thief', date, { tourName: 'New Tour' }),
          'Big Thief (Late Show)',
        ),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    )
    await crawlVenue(venue.id, mockBrowser)

    expect(await loadTourName('Big Thief')).toBe('New Tour')
  })

  it('leaves the stored tour name alone when the row never reaches the upsert', async () => {
    // tour_name is not part of the source hash, so an extraction that changes
    // ONLY the tour name is filtered out before the upsert entirely. Recorded
    // here so the COALESCE above is not mistaken for the only thing keeping an
    // admin entry alive on an otherwise-identical nightly crawl.
    const venue = await seedTestVenue()
    const date = futureDate(22)

    mockExtraction([makeEvent('Beach House', date)])
    await crawlVenue(venue.id, mockBrowser)
    await setTourNameAsAdmin('Beach House', 'Once Twice Melody')

    mockExtraction([makeEvent('Beach House', date)], `${HTML_BASE}<!-- 2 -->`)
    await crawlVenue(venue.id, mockBrowser)

    expect(await loadTourName('Beach House')).toBe('Once Twice Melody')
  })
})
