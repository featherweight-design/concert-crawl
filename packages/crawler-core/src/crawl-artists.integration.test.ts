import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { artists, db, events, venues } from '@concert-crawl/db'
import { crawlVenue } from './crawl.js'

// #1115 PR-B — the crawler keeps the `artists` projection fresh. A venue that
// announces a brand-new headliner (or a brand-new opener) must produce an
// `artists` row on that same crawl, or the artist page 404s until the next
// backfill run.
//
// Same IO-layer mocking as crawl.integration.test.ts: real Postgres, mocked
// fetcher / robots / LLM.

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
  // Every fixture below reports its performers, so the derivation ladder
  // settles on step 1 and never reaches here. A case that wants an
  // adjudication overrides this; anything else escalating is a bug, and
  // rejecting makes that loud instead of quietly spending a call.
  adjudicateEvent: vi
    .fn()
    .mockRejectedValue(
      new Error('adjudicateEvent is not stubbed for this test'),
    ),
}))
vi.mock('./lib/email.js', () => ({
  sendCrawlFailureEmail: vi.fn().mockResolvedValue(undefined),
  sendEventCountDropEmail: vi.fn().mockResolvedValue(undefined),
}))

import { fetchPage, fetchPageHttp } from './lib/fetcher.js'
import { adjudicateEvent, extractWithLlm } from './lib/extractors/llm.js'

const mockBrowser = {} as Browser
const mockFetchPage = vi.mocked(fetchPage)
const mockFetchPageHttp = vi.mocked(fetchPageHttp)
const mockExtractWithLlm = vi.mocked(extractWithLlm)
const mockAdjudicateEvent = vi.mocked(adjudicateEvent)

const HTML_BASE = '<html><body><p>Artist projection listing</p></body></html>'

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, artists, venues, crawl_runs, notifications, cost_tracking RESTART IDENTITY CASCADE`,
  )
}

async function seedTestVenue(): Promise<{ id: string; url: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Artist Projection Venue ${crypto.randomUUID()}`,
      slug: `artist-projection-${crypto.randomUUID()}`,
      websiteUrl: 'https://artist-projection.example.com',
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

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

interface ExtractedEvent {
  title: string
  rawTitle: string
  artist: string
  supportingArtists?: string[]
  /** Who the extractor SAW headlining. The ladder reads this, not `artist`. */
  observedPerformers?: string[]
  /**
   * Who the extractor SAW opening. Kept separate from `observedPerformers`
   * because the ladder reads an opener listed there as a co-headliner, which
   * would let a supporting-projection assertion pass on a headliner row.
   */
  observedSupportingArtists?: string[]
  date: string
  doorsTime: string | undefined
  showTime: string | undefined
  ticketUrl: string
  sourceUrl: string
  confidence: number
  /** Only the LLM extractor emits this; absent means "unclassified". */
  isConcert?: boolean
}

function makeEvent(
  artist: string,
  date: string,
  supportingArtists: string[] = [],
  isConcert?: boolean,
): ExtractedEvent {
  const title = `${artist} Live`
  return {
    title,
    rawTitle: title,
    artist,
    supportingArtists,
    observedPerformers: [artist],
    observedSupportingArtists: supportingArtists,
    date,
    doorsTime: undefined,
    showTime: undefined,
    ticketUrl: 'https://artist-projection.example.com/tickets',
    sourceUrl: 'https://artist-projection.example.com',
    confidence: 0.9,
    ...(isConcert === undefined ? {} : { isConcert }),
  }
}

function mockExtraction(extracted: ExtractedEvent[], html = HTML_BASE): void {
  mockFetchPage.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: 'https://artist-projection.example.com',
  })
  mockFetchPageHttp.mockResolvedValue({
    html,
    httpStatus: 200,
    finalUrl: 'https://artist-projection.example.com',
  })
  mockExtractWithLlm.mockResolvedValue({
    events: extracted,
    usage: { inputTokens: 0, outputTokens: 0 },
  })
}

beforeEach(async () => {
  await clearCrawlState()
  mockFetchPage.mockClear()
  mockFetchPageHttp.mockClear()
  mockExtractWithLlm.mockClear()
  mockAdjudicateEvent.mockClear()
  mockAdjudicateEvent.mockRejectedValue(
    new Error('adjudicateEvent is not stubbed for this test'),
  )
})

describe('crawlVenue — artists projection write-through (#1115)', () => {
  it('creates an artists row for a never-before-seen headliner', async () => {
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Sigur Rós', futureDate(20))])

    const run = await crawlVenue(venue.id, mockBrowser)
    expect(run.status).toBe('success')

    const [row] = await db
      .select()
      .from(artists)
      .where(eq(artists.canonicalName, 'sigur ros'))

    expect(row).toBeDefined()
    expect(row?.name).toBe('Sigur Rós')
    expect(row?.slug).toBe('sigur-ros')
    expect(row?.matchStatus).toBe('unmatched')
    expect(row?.spotifyArtistId).toBeNull()
  })

  it('creates rows for supporting artists too', async () => {
    const venue = await seedTestVenue()
    mockExtraction([
      makeEvent('Headline Act', futureDate(21), ['Opener One', 'Opener Two']),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName).sort()).toEqual([
      'headline act',
      'opener one',
      'opener two',
    ])
  })

  it('skips a listing the classifier ruled not a concert', async () => {
    // The nightly backfill has always filtered these out via
    // `hidden_from_consumer` (#1343); the write-through did not, and running
    // every 10 minutes it won. A sports fixture or a tour-package title became
    // an artist row minutes after the crawl, on a listing the backfill would
    // never have projected.
    const venue = await seedTestVenue()
    mockExtraction([
      makeEvent(
        'Colorado Avalanche vs. Calgary Flames',
        futureDate(27),
        [],
        false,
      ),
      makeEvent('Real Band', futureDate(28), ['Real Opener'], true),
    ])

    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName).sort()).toEqual([
      'real band',
      'real opener',
    ])
  })

  it('skips an event an admin hid by hand, whatever the extractor says', async () => {
    // The UPDATE path deliberately preserves an admin's `hiddenFromConsumer`
    // over a re-crawl still reporting `isConcert: true`, so the extractor's
    // verdict alone is not enough. Without reading the stored one back, the
    // reaper would remove this artist and the next crawl would put it
    // straight back, every ten minutes, forever.
    const venue = await seedTestVenue()
    const date = futureDate(30)
    await db.insert(events).values({
      venueId: venue.id,
      title: 'Misclassified Show',
      artist: 'Bingo Night',
      canonicalArtist: 'bingo night',
      canonicalTitle: 'misclassified show',
      date,
      status: 'upcoming',
      hiddenFromConsumer: true,
      sourceHash: 'stale-hash',
    })
    mockExtraction([makeEvent('Bingo Night', date, [], true)])

    await crawlVenue(venue.id, mockBrowser)

    expect(await db.select().from(artists)).toEqual([])
  })

  it('still projects a relist whose cancelled predecessor was hidden', async () => {
    // The upsert's UNIQUE index is partial on `status = 'upcoming'`, so a
    // cancelled row sits outside it and can share a key with the live event
    // that replaced it. Reading hidden events without that same restriction
    // would let a dead cancellation suppress a real show's artist.
    const venue = await seedTestVenue()
    const date = futureDate(31)
    await db.insert(events).values({
      venueId: venue.id,
      title: 'Relisted Show',
      artist: 'Relist Act',
      canonicalArtist: 'relist act',
      canonicalTitle: 'relisted show',
      date,
      status: 'cancelled',
      hiddenFromConsumer: true,
      sourceHash: 'cancelled-hash',
    })
    mockExtraction([makeEvent('Relist Act', date, [], true)])

    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName)).toEqual(['relist act'])
  })

  it('projects an event no classifier ruled on', async () => {
    // Only the LLM extractor emits `isConcert`. JSON-LD and the vendor
    // extractors emit nothing, so treating absent as "not a concert" would
    // stop projecting most of the catalogue.
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Unclassified Act', futureDate(29))])

    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName)).toEqual(['unclassified act'])
  })

  it('de-collides a slug against an artist already in the table', async () => {
    const venue = await seedTestVenue()
    await db
      .insert(artists)
      .values({ name: 'M.I.A.', canonicalName: 'm.i.a.', slug: 'mia' })
    mockExtraction([makeEvent('Mia', futureDate(22))])

    await crawlVenue(venue.id, mockBrowser)

    const [row] = await db
      .select()
      .from(artists)
      .where(eq(artists.canonicalName, 'mia'))
    expect(row?.slug).toBe('mia-2')
  })

  it('does not duplicate or renumber an artist seen on a previous crawl', async () => {
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Repeat Act', futureDate(23))])
    await crawlVenue(venue.id, mockBrowser)

    const [first] = await db.select().from(artists)
    if (!first) throw new Error('expected an artists row after the first crawl')

    mockExtraction(
      [makeEvent('Repeat Act', futureDate(24))],
      '<html><body><p>Second listing</p></body></html>',
    )
    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(first.id)
    expect(rows[0]?.slug).toBe(first.slug)
  })

  it('projects an artist whose events are all unchanged since the last crawl', async () => {
    // Regression: the projection used to be fed from the *upsert* set, which
    // excludes events whose source hash is unchanged. A venue crawled daily
    // whose listings never change therefore never re-projected, so an artist
    // missing from the table (crawled before #1115 shipped, or dropped by
    // hand) stayed missing forever and its shows could never resolve a photo.
    const venue = await seedTestVenue()
    mockExtraction([makeEvent('Stable Act', futureDate(26), ['Stable Opener'])])
    await crawlVenue(venue.id, mockBrowser)
    await db.delete(artists)

    // Same events, different page bytes: the page-hash skip must not fire, so
    // the crawl reaches extraction but upserts nothing.
    mockExtraction(
      [makeEvent('Stable Act', futureDate(26), ['Stable Opener'])],
      '<html><body><p>Same shows, repainted page</p></body></html>',
    )
    const run = await crawlVenue(venue.id, mockBrowser)

    expect(run.status).toBe('success')
    expect(run.eventsInserted).toBe(0)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName).sort()).toEqual([
      'stable act',
      'stable opener',
    ])
  })

  it('adjudicates a performer field that only echoes an event-shaped title', async () => {
    // The defect this whole stage exists to close: the venue's `performer`
    // field repeats its own headline, the old code trusted it, and "80s Night
    // Dance Party" became an artist. The echo is the tell, so the ladder
    // escalates — and a non-concert verdict projects nobody while `artist`
    // keeps holding the display string the row is titled with.
    const venue = await seedTestVenue()
    const date = futureDate(32)
    const title = '80s Night Dance Party'
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    })
    mockExtraction([
      {
        title,
        rawTitle: title,
        artist: title,
        supportingArtists: [],
        observedPerformers: [title],
        date,
        doorsTime: undefined,
        showTime: undefined,
        ticketUrl: 'https://artist-projection.example.com/tickets',
        sourceUrl: 'https://artist-projection.example.com',
        confidence: 0.9,
      },
    ])

    await crawlVenue(venue.id, mockBrowser)

    expect(mockAdjudicateEvent).toHaveBeenCalledOnce()
    expect(await db.select().from(artists)).toEqual([])

    const [row] = await db.select().from(events).where(eq(events.date, date))
    expect(row?.artist).toBe(title)
    expect(row?.headliners).toEqual([])
    expect(row?.canonicalHeadliners).toEqual([])
  })

  it('projects the act the adjudicator names behind an event-shaped title', async () => {
    const venue = await seedTestVenue()
    const date = futureDate(33)
    const title = 'Sunset Sessions presents: Kokoroko'
    mockAdjudicateEvent.mockResolvedValue({
      isConcert: true,
      headliners: ['Kokoroko'],
      supportingArtists: ['Nubiyan Twist'],
    })
    mockExtraction([
      {
        title,
        rawTitle: title,
        artist: title,
        supportingArtists: [],
        observedPerformers: [title],
        date,
        doorsTime: undefined,
        showTime: undefined,
        ticketUrl: 'https://artist-projection.example.com/tickets',
        sourceUrl: 'https://artist-projection.example.com',
        confidence: 0.9,
      },
    ])

    await crawlVenue(venue.id, mockBrowser)

    const rows = await db.select().from(artists)
    expect(rows.map((row) => row.canonicalName).sort()).toEqual([
      'kokoroko',
      'nubiyan twist',
    ])

    const [row] = await db.select().from(events).where(eq(events.date, date))
    expect(row?.headliners).toEqual(['Kokoroko'])
  })

  it('still writes the events when the artists projection fails', async () => {
    const venue = await seedTestVenue()
    // Force every artists INSERT to fail. Crawl data is the product's core
    // value — a projection hiccup must never cost an event row.
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION artists_projection_boom() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'artists projection boom'; END;
      $$ LANGUAGE plpgsql
    `)
    await db.execute(
      sql`CREATE TRIGGER artists_projection_boom_trigger BEFORE INSERT ON artists FOR EACH ROW EXECUTE FUNCTION artists_projection_boom()`,
    )

    try {
      mockExtraction([makeEvent('Resilient Act', futureDate(25))])
      const run = await crawlVenue(venue.id, mockBrowser)

      expect(run.status).toBe('success')
      expect(run.eventsInserted).toBe(1)

      const artistRows = await db.select().from(artists)
      expect(artistRows).toHaveLength(0)
    } finally {
      await db.execute(
        sql`DROP TRIGGER IF EXISTS artists_projection_boom_trigger ON artists`,
      )
      await db.execute(
        sql`DROP FUNCTION IF EXISTS artists_projection_boom() CASCADE`,
      )
    }
  })
})
