import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db, venues, events, crawlRuns, notifications } from '@concert-crawl/db'
import { eq, and, desc } from 'drizzle-orm'
import { crawlVenue } from './crawl.js'

// Mock external I/O — only the fetch and LLM calls leave the process
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

const mockFetchPage = vi.mocked(fetchPage)
const mockExtractWithLlm = vi.mocked(extractWithLlm)

beforeEach(() => {
  mockFetchPage.mockClear()
  mockExtractWithLlm.mockClear()
})

// Minimal venue fixture — inserted fresh per test
async function seedVenue() {
  const slug = `test-venue-${crypto.randomUUID()}`
  const [venue] = await db
    .insert(venues)
    .values({
      name: 'Test Venue',
      slug,
      websiteUrl: 'https://test-venue.example.com',
      city: 'Denver',
      active: true,
      verified: true,
    })
    .returning()
  if (!venue) throw new Error('venue seed failed')
  return venue
}

async function cleanVenue(venueId: string) {
  await db.delete(venues).where(eq(venues.id, venueId))
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
    const venue = await seedVenue()
    try {
      mockFetchPage.mockResolvedValue({
        html: HTML_V1,
        httpStatus: 200,
        finalUrl: venue.websiteUrl,
      })
      mockExtractWithLlm.mockResolvedValue({
        events: [METALLICA_EVENT],
        usage: { inputTokens: 100, outputTokens: 50 },
      })

      // First crawl — page is new, should extract
      await crawlVenue(venue.id)

      // Second crawl — same HTML, should skip
      const run = await crawlVenue(venue.id)

      expect(run.eventsFound).toBe(0)
      expect(run.eventsInserted).toBe(0)
      expect(run.status).toBe('success')

      // Verify crawl.skipped was logged (check crawl_runs for a skipped row)
      const [skippedRun] = await db
        .select()
        .from(crawlRuns)
        .where(eq(crawlRuns.venueId, venue.id))
        .orderBy(desc(crawlRuns.createdAt))
        .limit(1)
      expect(skippedRun?.pageHash).toMatch(/^[0-9a-f]{64}$/)
    } finally {
      await cleanVenue(venue.id)
    }
  })

  it('proceeds to extraction when page hash differs', async () => {
    const venue = await seedVenue()
    try {
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
    } finally {
      await cleanVenue(venue.id)
    }
  })
})

describe('crawlVenue — event-level sourceHash', () => {
  it('skips DB write for unchanged non-verified events', async () => {
    const venue = await seedVenue()
    try {
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

      // Same event returned again — hash will match, should not write
      const run2 = await crawlVenue(venue.id)
      expect(run2.eventsInserted).toBe(0) // unchanged — skipped

      const allEvents = await db
        .select()
        .from(events)
        .where(eq(events.venueId, venue.id))
      expect(allEvents).toHaveLength(1)
    } finally {
      await cleanVenue(venue.id)
    }
  })

  it('inserts admin alert when a verified event sourceHash changes', async () => {
    const venue = await seedVenue()
    try {
      const updatedEvent = { ...METALLICA_EVENT, doorsTime: '19:00' } // changed field

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

      await crawlVenue(venue.id)

      // Manually mark the event as verified
      await db
        .update(events)
        .set({ verified: true })
        .where(
          and(eq(events.venueId, venue.id), eq(events.artist, 'Metallica')),
        )

      await crawlVenue(venue.id)

      // Find the notification for this specific venue by parsing metadata
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
    } finally {
      await cleanVenue(venue.id)
    }
  })
})
