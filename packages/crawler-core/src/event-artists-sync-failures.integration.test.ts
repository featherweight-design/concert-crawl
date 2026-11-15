import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { Browser } from 'playwright';
import { db, events, syncEventArtists, venues } from '@concert-crawl/db';
import { reportFailure } from '@concert-crawl/logger';
import { crawlVenue } from './crawl.js';
import { mergeDuplicateNights } from './merge-duplicate-nights.js';

// Admin 4a-2: the `event_artists` rebuild is a projection the backfill can
// always redo, so its failure must never cost a crawl its events or undo a
// duplicate-night fill whose donor rows are already gone. Real Postgres; the
// sync is the real one unless a test makes it reject.

vi.mock('@concert-crawl/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@concert-crawl/db')>();
  return { ...actual, syncEventArtists: vi.fn(actual.syncEventArtists) };
});
vi.mock('@concert-crawl/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@concert-crawl/logger')>()),
  reportFailure: vi.fn(),
}));
vi.mock('./lib/fetcher.js', () => ({
  fetchPage: vi.fn(),
  fetchPageHttp: vi.fn(),
  CrawlFetchError: class CrawlFetchError extends Error {
    constructor(
      public httpStatus: number,
      message: string,
    ) {
      super(message);
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
      super(message);
      this.name = 'CrawlSelectorTimeoutError';
    }
  },
}));
vi.mock('./lib/robots.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/robots.js')>()),
  isAllowed: vi.fn().mockResolvedValue(true),
  isAllowedOrSkip: vi.fn().mockResolvedValue(true),
  checkRobots: vi.fn().mockResolvedValue({ status: 'allowed' }),
  isAiUseAllowed: vi.fn().mockResolvedValue(true),
  getCrawlDelayMs: vi.fn().mockResolvedValue(null),
}));
vi.mock('./lib/extractors/llm.js', () => ({
  extractWithLlm: vi.fn(),
  adjudicateEvent: vi
    .fn()
    .mockRejectedValue(
      new Error('adjudicateEvent is not stubbed for this test'),
    ),
}));
vi.mock('./lib/email.js', () => ({
  sendCrawlFailureEmail: vi.fn().mockResolvedValue(undefined),
  sendEventCountDropEmail: vi.fn().mockResolvedValue(undefined),
}));

import { fetchPage, fetchPageHttp } from './lib/fetcher.js';
import { extractWithLlm } from './lib/extractors/llm.js';

const SOURCE_URL = 'https://sync-failure.example.com';
const mockBrowser = (): Promise<Browser> => {
  throw new Error('browser must not be launched in an HTTP-mode crawl');
};
const mockSync = vi.mocked(syncEventArtists);
const mockReportFailure = vi.mocked(reportFailure);

function futureDate(daysFromNow: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + daysFromNow);
  return now.toISOString().slice(0, 10);
}

async function seedTestVenue(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Sync Failure Venue ${crypto.randomUUID()}`,
      slug: `sync-failure-${crypto.randomUUID()}`,
      websiteUrl: SOURCE_URL,
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'http',
    })
    .returning();
  if (!venue) throw new Error('venue insert returned no row');
  return venue.id;
}

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE events, event_redirects, artists, venues, crawl_runs, notifications, cost_tracking, audit_log RESTART IDENTITY CASCADE`,
  );
  mockSync.mockClear();
  mockReportFailure.mockClear();
});

describe('event_artists rebuild failures (admin 4a-2)', () => {
  it('a crawl whose rebuild rejects still succeeds, keeps its event and reports', async () => {
    const venueId = await seedTestVenue();
    const date = futureDate(23);
    for (const mock of [vi.mocked(fetchPage), vi.mocked(fetchPageHttp)]) {
      mock.mockResolvedValue({
        html: '<html><body>listing</body></html>',
        httpStatus: 200,
        finalUrl: SOURCE_URL,
      });
    }
    vi.mocked(extractWithLlm).mockResolvedValue({
      events: [
        {
          title: 'Sync Fails Live',
          rawTitle: 'Sync Fails Live',
          artist: 'Sync Fails',
          date,
          sourceUrl: SOURCE_URL,
          confidence: 0.9,
          observedPerformers: ['Sync Fails'],
        },
      ],
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    mockSync.mockRejectedValueOnce(new Error('event_artists unavailable'));

    const run = await crawlVenue(venueId, mockBrowser);

    expect(run.status).toBe('success');
    const rows = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.venueId, venueId));
    expect(rows).toHaveLength(1);
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'crawl.event_artists_sync_failed',
        venueId,
        error: 'event_artists unavailable',
      }),
    );
  });

  it('a duplicate-night fold whose rebuild rejects keeps the fill and reports', async () => {
    const venueId = await seedTestVenue();
    const date = futureDate(23);
    const [survivor, donor] = await db
      .insert(events)
      .values([
        {
          venueId,
          title: 'Kept Fill',
          artist: 'Kept Fill',
          canonicalArtist: 'kept fill',
          canonicalTitle: 'kept fill',
          date,
          showTime: '20:00',
        },
        {
          venueId,
          title: 'Kept Fill',
          artist: 'Kept Fill',
          canonicalArtist: 'kept fill',
          canonicalTitle: 'kept fill',
          date,
          showTime: null,
          imageUrl: 'https://img.example.com/kept-fill.jpg',
          headliners: ['Kept Fill'],
          canonicalHeadliners: ['kept fill'],
        },
      ])
      .returning({ id: events.id });
    if (!survivor || !donor) throw new Error('insert returned no rows');
    mockSync.mockRejectedValueOnce(new Error('event_artists unavailable'));

    const result = await mergeDuplicateNights({ dryRun: false });

    const [after] = await db
      .select()
      .from(events)
      .where(eq(events.id, survivor.id));
    expect(after?.imageUrl).toBe('https://img.example.com/kept-fill.jpg');
    expect(after?.headliners).toEqual(['Kept Fill']);
    expect(result.groups[0]?.fillError).toMatch(
      /fill kept, lineup rows not rebuilt: event_artists unavailable/,
    );
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'merge_duplicate_nights.event_artists_sync_failed',
        eventId: survivor.id,
      }),
    );
  });
});
