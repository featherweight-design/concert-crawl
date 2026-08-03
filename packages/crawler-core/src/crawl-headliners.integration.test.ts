import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { db, events, venues } from '@concert-crawl/db'
import { crawlVenue } from './crawl.js'

// #1203 — the crawler persists the headliner set as a first-class array.
// `headliners[0]` is always `artist`, and `canonical_headliners` is the
// element-wise canonicalization of it. The crawler NEVER derives multiple
// headliners itself: only the LLM extractor decides that a bill has more than
// one, so an extraction without `headliners` collapses to `[artist]` and a
// band name containing '&' stays one act.
//
// Same IO-layer mocking as crawl-artists.integration.test.ts: real Postgres,
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
  // crawl.ts narrows on this with `instanceof`, so an absent constructor makes
  // the catch path throw rather than classify (#1404).
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

const mockBrowser = {} as Browser
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

const SOURCE_URL = 'https://headliners.example.com'
const HTML_BASE = '<html><body><p>Headliner listing</p></body></html>'

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, artists, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedTestVenue(): Promise<{ id: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Headliner Venue ${crypto.randomUUID()}`,
      slug: `headliner-venue-${crypto.randomUUID()}`,
      websiteUrl: SOURCE_URL,
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
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
  headliners?: string[]
  supportingArtists?: string[]
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

async function loadEvent(artist: string): Promise<{
  headliners: string[] | null
  canonicalHeadliners: string[] | null
  canonicalArtist: string
  artist: string
  supportingArtists: string[] | null
}> {
  const [row] = await db
    .select({
      headliners: events.headliners,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalArtist: events.canonicalArtist,
      artist: events.artist,
      supportingArtists: events.supportingArtists,
    })
    .from(events)
    .where(eq(events.artist, artist))
  if (!row) throw new Error(`no events row for artist "${artist}"`)
  return row
}

beforeEach(async () => {
  await clearCrawlState()
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
})

describe('crawlVenue — headliner set persistence (#1203)', () => {
  it('falls back to [artist] when the extractor emits no headliners', async () => {
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Sigur Rós', futureDate(20))])

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')

    const row = await loadEvent('Sigur Rós')
    expect(row.headliners).toEqual(['Sigur Rós'])
    expect(row.canonicalHeadliners).toEqual(['sigur ros'])
    // The invariant: headliners[0] is the artist string.
    expect(row.headliners?.[0]).toBe('Sigur Rós')
  })

  it('persists a multi-headliner array and canonicalizes every entry', async () => {
    const venue = await seedTestVenue()
    mockExtraction([
      makeEvent('Desert Dwellers', futureDate(21), {
        headliners: ['Desert Dwellers', 'Great Dane'],
        supportingArtists: ['Numatik'],
      }),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Desert Dwellers')
    expect(row.headliners).toEqual(['Desert Dwellers', 'Great Dane'])
    // canonicalizeSupporting dedupes and sorts, so assert as a set.
    expect([...(row.canonicalHeadliners ?? [])].sort()).toEqual([
      'desert dwellers',
      'great dane',
    ])
    expect(row.canonicalArtist).toBe('desert dwellers')
    // The opener stays an opener — it never leaks into the headliner set.
    expect(row.supportingArtists).toEqual(['Numatik'])
    expect(row.canonicalHeadliners).not.toContain('numatik')
  })

  it('keeps a band name containing an ampersand as ONE headliner', async () => {
    const venue = await seedTestVenue()
    // The extractor emits the whole name; nothing downstream splits on '&'.
    mockExtraction([
      makeEvent('Iron & Wine', futureDate(22), {
        headliners: ['Iron & Wine'],
      }),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Iron & Wine')
    expect(row.headliners).toEqual(['Iron & Wine'])
    expect(row.canonicalHeadliners).toHaveLength(1)
  })

  it('rewrites the headliner set on re-crawl when the billing changes', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(23)
    mockExtraction([makeEvent('Turnstile', date)])
    await crawlVenue(venue.id, mockBrowser)
    expect((await loadEvent('Turnstile')).headliners).toEqual(['Turnstile'])

    // Same (venue, date, canonical_artist, show_time) → the ON CONFLICT path.
    // The title has to move too: an unchanged source hash short-circuits the
    // upsert entirely, so re-billing alone would never reach the `set` clause.
    mockExtraction(
      [
        makeEvent('Turnstile', date, {
          title: 'Turnstile & Snail Mail Co-Headline',
          rawTitle: 'Turnstile & Snail Mail Co-Headline',
          headliners: ['Turnstile', 'Snail Mail'],
        }),
      ],
      '<html><body><p>Updated listing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Turnstile')
    expect(row.headliners).toEqual(['Turnstile', 'Snail Mail'])
    expect([...(row.canonicalHeadliners ?? [])].sort()).toEqual([
      'snail mail',
      'turnstile',
    ])
  })

  it('collapses back to a single headliner when a co-headline bill is downgraded', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(25)
    mockExtraction([
      makeEvent('Fontaines D.C.', date, {
        title: 'Fontaines D.C. & Just Mustard',
        rawTitle: 'Fontaines D.C. & Just Mustard',
        headliners: ['Fontaines D.C.', 'Just Mustard'],
      }),
    ])
    await crawlVenue(venue.id, mockBrowser)

    // The upsert rebuilds the array as array_prepend(artist, excluded[2:]).
    // Postgres yields an empty array — never NULL — for a slice past the end,
    // so a one-element extraction leaves headliners as [artist] rather than
    // nulling the column out.
    mockExtraction(
      [makeEvent('Fontaines D.C.', date, { headliners: ['Fontaines D.C.'] })],
      '<html><body><p>Solo billing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Fontaines D.C.')
    expect(row.headliners).toEqual(['Fontaines D.C.'])
    expect(row.canonicalHeadliners).toEqual(['fontaines d.c.'])
  })

  it('keeps headliners[0] equal to the stored artist when the extracted string drifts', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(24)
    mockExtraction([makeEvent('Bjork', date)])
    await crawlVenue(venue.id, mockBrowser)

    // Re-crawl produces the diacritic form. `artist` is deliberately never
    // updated on conflict, and canonical_artist is unchanged, so headliners[0]
    // must stay the STORED string or the invariant breaks.
    mockExtraction(
      [
        makeEvent('Björk', date, {
          title: 'Björk & Arca',
          rawTitle: 'Björk & Arca',
          headliners: ['Björk', 'Arca'],
        }),
      ],
      '<html><body><p>Updated listing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const row = await loadEvent('Bjork')
    expect(row.headliners?.[0]).toBe(row.artist)
    expect(row.headliners).toEqual(['Bjork', 'Arca'])
  })
})
