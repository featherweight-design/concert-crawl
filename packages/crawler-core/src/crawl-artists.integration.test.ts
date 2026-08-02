import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import type { Browser } from 'playwright'
import { artists, db, venues } from '@concert-crawl/db'
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
  supportingArtists: string[] = [],
): ExtractedEvent {
  const title = `${artist} Live`
  return {
    title,
    rawTitle: title,
    artist,
    supportingArtists,
    date,
    doorsTime: undefined,
    showTime: undefined,
    ticketUrl: 'https://artist-projection.example.com/tickets',
    sourceUrl: 'https://artist-projection.example.com',
    confidence: 0.9,
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
