import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { Browser } from 'playwright';
import {
  auditLog,
  db,
  eventRedirects,
  events,
  mergeEventRows,
  venues,
} from '@concert-crawl/db';
import { crawlVenue } from './crawl.js';
import { sweepStaleEvents } from './lib/stale-event-sweep.js';
import { reconcileDriftDuplicates } from './reconcile-drift-duplicates.js';
import { mergeDuplicateNights } from './merge-duplicate-nights.js';

// Admin 4a (docs/superpowers/plans/2026-11-13-admin-4a-events-data.md):
//   - a show added by hand (`events.manual`) is never marked missing, swept,
//     reconciled away or folded by the duplicate-night cleanup, and a crawled
//     listing that lands on it writes crawl-owned fields only;
//   - a lineup an admin saved (`lineup_edited_at`) keeps its bill;
//   - a listing whose key an admin merged away updates the merge target
//     instead of inserting the duplicate again (READINESS A1).
//
// Same IO-layer mocking as crawl-tour-name.integration.test.ts: real Postgres,
// mocked fetcher / robots / LLM.

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

const mockBrowser = (): Promise<Browser> => {
  throw new Error('browser must not be launched in an HTTP-mode crawl');
};
const mockFetchPage = vi.mocked(fetchPage);
const mockFetchPageHttp = vi.mocked(fetchPageHttp);
const mockExtractWithLlm = vi.mocked(extractWithLlm);

const SOURCE_URL = 'https://manual.example.com';
const HTML_BASE = '<html><body><p>Manual listing</p></body></html>';
const DAY_MS = 24 * 60 * 60 * 1000;

async function clearCrawlState(): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, event_redirects, artists, venues, crawl_runs, notifications, cost_tracking, audit_log RESTART IDENTITY CASCADE`,
  );
}

async function seedTestVenue(): Promise<{ id: string }> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Manual Venue ${crypto.randomUUID()}`,
      slug: `manual-venue-${crypto.randomUUID()}`,
      websiteUrl: SOURCE_URL,
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'http',
    })
    .returning();
  if (!venue) throw new Error('venue insert returned no row');
  return { id: venue.id };
}

function futureDate(daysFromNow: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + daysFromNow);
  return now.toISOString().slice(0, 10);
}

interface ExtractedEvent {
  title: string;
  rawTitle: string;
  artist: string;
  date: string;
  sourceUrl: string;
  confidence: number;
  ticketUrl?: string;
}

function makeEvent(
  artist: string,
  date: string,
  extra: Partial<ExtractedEvent> = {},
): ExtractedEvent {
  const title = `${artist} Live`;
  return {
    title,
    rawTitle: title,
    artist,
    date,
    sourceUrl: SOURCE_URL,
    confidence: 0.9,
    ...extra,
  };
}

// `html` must differ between two crawls of the same venue: crawlVenue
// short-circuits to status 'skipped' when the page hash is unchanged.
function mockExtraction(extracted: ExtractedEvent[], html = HTML_BASE): void {
  for (const mock of [mockFetchPage, mockFetchPageHttp]) {
    mock.mockResolvedValue({ html, httpStatus: 200, finalUrl: SOURCE_URL });
  }
  mockExtractWithLlm.mockResolvedValue({
    events: extracted,
    usage: { inputTokens: 0, outputTokens: 0 },
  });
}

async function rowFor(artist: string) {
  const [row] = await db.select().from(events).where(eq(events.artist, artist));
  if (!row) throw new Error(`no events row for artist "${artist}"`);
  return row;
}

beforeEach(async () => {
  await clearCrawlState();
  mockFetchPage.mockClear();
  mockFetchPageHttp.mockClear();
  mockExtractWithLlm.mockClear();
});

describe('crawlVenue — shows added by hand (admin 4a)', () => {
  it('keeps the title and bill of a manual row the listing lands on, and takes the ticket link', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);

    mockExtraction([makeEvent('Kaleo', date)]);
    await crawlVenue(venue.id, mockBrowser);
    const crawled = await rowFor('Kaleo');
    await db
      .update(events)
      .set({
        manual: true,
        createdBy: 'user_admin',
        title: 'Kaleo (added by hand)',
        headliners: ['Kaleo', 'The Band of Heathens'],
        canonicalHeadliners: ['kaleo', 'the band of heathens'],
        description: 'Typed by an admin',
        ticketUrl: null,
      })
      .where(eq(events.id, crawled.id));

    mockExtraction(
      [
        makeEvent('Kaleo', date, {
          title: 'KALEO: Tour',
          rawTitle: 'KALEO: Tour',
          ticketUrl: 'https://tickets.example.org/kaleo',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const after = await rowFor('Kaleo');
    expect(after.id).toBe(crawled.id);
    expect(after.manual).toBe(true);
    expect(after.title).toBe('Kaleo (added by hand)');
    expect(after.headliners).toEqual(['Kaleo', 'The Band of Heathens']);
    expect(after.description).toBe('Typed by an admin');
    expect(after.ticketUrl).toBe('https://tickets.example.org/kaleo');
  });

  it('never marks a manual row missing or sweeps it, while a crawled row is', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);

    mockExtraction([
      makeEvent('Hand Act', date),
      makeEvent('Crawled Act', date),
    ]);
    await crawlVenue(venue.id, mockBrowser);
    await db
      .update(events)
      .set({ manual: true })
      .where(eq(events.artist, 'Hand Act'));

    // The next crawl lists neither show.
    mockExtraction([makeEvent('Other Act', date)], `${HTML_BASE}<!-- 2 -->`);
    await crawlVenue(venue.id, mockBrowser);

    expect((await rowFor('Hand Act')).firstMissingAt).toBeNull();
    expect((await rowFor('Crawled Act')).firstMissingAt).not.toBeNull();

    // Even a manual row that somehow carries a missing mark is never swept.
    await db
      .update(events)
      .set({ firstMissingAt: new Date(Date.now() - 30 * DAY_MS) })
      .where(eq(events.artist, 'Hand Act'));
    await db
      .update(events)
      .set({ firstMissingAt: new Date(Date.now() - 30 * DAY_MS) })
      .where(eq(events.artist, 'Crawled Act'));
    await sweepStaleEvents(new Date());

    expect((await rowFor('Hand Act')).status).toBe('upcoming');
    expect((await rowFor('Crawled Act')).status).toBe('cancelled');
  });

  it('never reconciles a manual row away as a drift duplicate', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);

    mockExtraction([makeEvent('Drift Band', date)]);
    await crawlVenue(venue.id, mockBrowser);
    const live = await rowFor('Drift Band');
    // A missing manual row that the reconcile rule would otherwise match:
    // the live sibling's canonical title contains its canonical artist.
    const [manual] = await db
      .insert(events)
      .values({
        venueId: venue.id,
        title: 'Drift Band',
        artist: 'Drift Band (hand)',
        canonicalArtist: live.canonicalArtist,
        canonicalTitle: live.canonicalArtist,
        date,
        showTime: '21:00',
        manual: true,
        firstMissingAt: new Date(),
      })
      .returning({ id: events.id });
    if (!manual) throw new Error('manual insert returned no row');

    await reconcileDriftDuplicates(venue.id);

    const [still] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, manual.id));
    expect(still?.id).toBe(manual.id);
  });

  it('leaves manual rows out of the duplicate-night cleanup', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);
    const [hand, other] = await db
      .insert(events)
      .values([
        {
          venueId: venue.id,
          title: 'Twin Show',
          artist: 'Twin Show',
          canonicalArtist: 'twin show',
          canonicalTitle: 'twin show',
          date,
          showTime: '20:00',
          manual: true,
        },
        {
          venueId: venue.id,
          title: 'Twin Show',
          artist: 'Twin Show',
          canonicalArtist: 'twin show',
          canonicalTitle: 'twin show',
          date,
          // Untimed beside a timed row: the cleanup's rule groups these as
          // one night, so only the manual guard keeps them apart.
          showTime: null,
        },
      ])
      .returning({ id: events.id });
    if (!hand || !other) throw new Error('insert returned no rows');

    await mergeDuplicateNights({ dryRun: false });

    const remaining = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.venueId, venue.id));
    expect(remaining.map((row) => row.id).sort()).toEqual(
      [hand.id, other.id].sort(),
    );
  });
});

describe('crawlVenue — a lineup an admin saved (admin 4a)', () => {
  it('keeps the saved bill when a re-crawl reaches the upsert', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(21);

    mockExtraction([makeEvent('Locked Band', date)]);
    await crawlVenue(venue.id, mockBrowser);
    await db
      .update(events)
      .set({
        headliners: ['Locked Band'],
        canonicalHeadliners: ['locked band'],
        supportingArtists: ['Admin Opener'],
        canonicalSupporting: ['admin opener'],
        lineupEditedAt: new Date(),
      })
      .where(eq(events.artist, 'Locked Band'));

    // A title change moves the source hash, so the row reaches the upsert.
    mockExtraction(
      [
        makeEvent('Locked Band', date, {
          title: 'Locked Band (Late)',
          rawTitle: 'Locked Band (Late)',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const after = await rowFor('Locked Band');
    expect(after.title).toBe('Locked Band (Late)');
    expect(after.supportingArtists).toEqual(['Admin Opener']);
    expect(after.canonicalSupporting).toEqual(['admin opener']);
  });

  it('a duplicate-night fold never fills a saved lineup from a donor', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(21);
    const [survivor, donor] = await db
      .insert(events)
      .values([
        {
          venueId: venue.id,
          title: 'Fold Show',
          artist: 'Fold Show',
          canonicalArtist: 'fold show',
          canonicalTitle: 'fold show',
          date,
          showTime: '20:00',
          lineupEditedAt: new Date(),
        },
        {
          venueId: venue.id,
          title: 'Fold Show',
          artist: 'Fold Show',
          canonicalArtist: 'fold show',
          canonicalTitle: 'fold show',
          date,
          showTime: null,
          headliners: ['Donor Bill'],
          canonicalHeadliners: ['donor bill'],
        },
      ])
      .returning({ id: events.id });
    if (!survivor || !donor) throw new Error('insert returned no rows');

    await mergeDuplicateNights({ dryRun: false });

    // The timed row survives (equal references, then a timed row), and the
    // donor's bill is not filled into its saved, empty lineup.
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id));
    expect(rows.map((row) => row.id)).toEqual([survivor.id]);
    expect(rows[0]?.headliners).toBeNull();
  });
});

describe('crawlVenue — a merged-away listing (admin 4a, READINESS A1)', () => {
  it('updates the merge target instead of inserting the duplicate again', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);

    mockExtraction([
      makeEvent('Clipse', date, {
        ticketUrl: 'https://tickets.example.org/clipse',
      }),
      makeEvent('CLIPSE with special guest JID', date),
    ]);
    await crawlVenue(venue.id, mockBrowser);
    const kept = await rowFor('CLIPSE with special guest JID');
    const gone = await rowFor('Clipse');

    await mergeEventRows({
      sourceId: gone.id,
      targetId: kept.id,
      actorId: 'user_admin',
      suggestion: null,
      notifyWatchers: false,
    });

    const [redirect] = await db
      .select()
      .from(eventRedirects)
      .where(eq(eventRedirects.sourceId, gone.id));
    expect(redirect?.targetId).toBe(kept.id);
    expect(redirect?.sourceVenueId).toBe(venue.id);
    expect(redirect?.sourceDate).toBe(date);
    expect(redirect?.sourceCanonicalArtist).toBe(gone.canonicalArtist);

    const [audit] = await db
      .select({ metadata: auditLog.metadata })
      .from(auditLog)
      .where(eq(auditLog.action, 'event.merge'));
    expect(audit?.metadata).toMatchObject({
      sourceId: gone.id,
      source: { id: gone.id, title: gone.title },
    });

    // Only the merged-away listing is still up: the kept row's own listing
    // is gone, yet it is neither duplicated nor counted missing.
    mockExtraction(
      [
        makeEvent('Clipse', date, {
          title: 'Clipse Live!',
          rawTitle: 'Clipse Live!',
          ticketUrl: 'https://tickets.example.org/clipse',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const rows = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id));
    expect(rows.map((row) => row.id)).toEqual([kept.id]);
    const [after] = rows;
    expect(after?.title).toBe(kept.title);
    expect(after?.ticketUrl).toBe('https://tickets.example.org/clipse');
    expect(after?.firstMissingAt).toBeNull();
  });
});
