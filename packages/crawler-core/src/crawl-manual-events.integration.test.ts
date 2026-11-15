import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import type { Browser } from 'playwright';
import {
  artists,
  auditLog,
  db,
  eventArtists,
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
  eventUrl?: string;
  showTime?: string;
  observedPerformers?: string[];
  observedSupportingArtists?: string[];
  isConcert?: boolean;
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

  it("lands a title-shaped listing on the night's one manual row at its time, and inserts the late show", async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);
    const [hand] = await db
      .insert(events)
      .values({
        venueId: venue.id,
        title: 'Kokoroko',
        artist: 'Kokoroko',
        canonicalArtist: 'kokoroko',
        canonicalTitle: 'kokoroko',
        headliners: ['Kokoroko'],
        canonicalHeadliners: ['kokoroko'],
        date,
        showTime: '19:00',
        manual: true,
      })
      .returning({ id: events.id });
    if (!hand) throw new Error('manual insert returned no row');

    mockExtraction([
      makeEvent('Jazz Series presents', date, {
        showTime: '19:00',
        ticketUrl: 'https://tickets.example.org/early',
      }),
      makeEvent('Jazz Series presents', date, { showTime: '22:00' }),
    ]);
    await crawlVenue(venue.id, mockBrowser);

    const rows = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue.id))
      .orderBy(asc(events.showTime));
    expect(rows).toHaveLength(2);
    const [early, late] = rows;
    expect(early?.id).toBe(hand.id);
    expect(early?.manual).toBe(true);
    expect(early?.artist).toBe('Kokoroko');
    expect(early?.title).toBe('Kokoroko');
    expect(early?.headliners).toEqual(['Kokoroko']);
    expect(early?.ticketUrl).toBe('https://tickets.example.org/early');
    expect(late?.manual).toBe(false);
    expect(late?.showTime).toBe('22:00:00');
  });
});

describe('crawlVenue — a manual row keeps a typed ticket link (admin 4a)', () => {
  it('a listing without a link never erases the one an admin typed', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(20);

    mockExtraction([makeEvent('Typed Link', date)]);
    await crawlVenue(venue.id, mockBrowser);
    await db
      .update(events)
      .set({
        manual: true,
        ticketUrl: 'https://axs.example.org/typed',
        ticketLinks: [
          {
            kind: 'primary',
            vendor: null,
            url: 'https://axs.example.org/typed',
          },
        ],
      })
      .where(eq(events.artist, 'Typed Link'));

    mockExtraction(
      [
        makeEvent('Typed Link', date, {
          title: 'Typed Link (Late)',
          rawTitle: 'Typed Link (Late)',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const after = await rowFor('Typed Link');
    expect(after.ticketUrl).toBe('https://axs.example.org/typed');
    expect(after.ticketLinks).toEqual([
      { kind: 'primary', vendor: null, url: 'https://axs.example.org/typed' },
    ]);
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

  it('does not project the listing bill of a saved lineup as artists', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(21);

    mockExtraction([makeEvent('Saved Bill', date)]);
    await crawlVenue(venue.id, mockBrowser);
    await db
      .update(events)
      .set({ lineupEditedAt: new Date() })
      .where(eq(events.artist, 'Saved Bill'));

    mockExtraction(
      [
        makeEvent('Saved Bill', date, {
          title: 'Saved Bill (Late)',
          rawTitle: 'Saved Bill (Late)',
          observedPerformers: ['Saved Bill'],
          observedSupportingArtists: ['Removed Opener'],
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const projected = await db
      .select({ canonicalName: artists.canonicalName })
      .from(artists)
      .where(eq(artists.canonicalName, 'removed opener'));
    expect(projected).toEqual([]);
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

  it('a crawled target keeps its own ticket link and event page', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(24);

    mockExtraction([
      makeEvent('Own Link', date, {
        ticketUrl: 'https://tickets.example.org/own',
        eventUrl: 'https://manual.example.com/own',
      }),
      makeEvent('Other Link', date),
    ]);
    await crawlVenue(venue.id, mockBrowser);
    const kept = await rowFor('Own Link');
    const gone = await rowFor('Other Link');
    await mergeEventRows({
      sourceId: gone.id,
      targetId: kept.id,
      actorId: 'user_admin',
      suggestion: null,
      notifyWatchers: false,
    });

    mockExtraction(
      [
        makeEvent('Other Link', date, {
          title: 'Other Link!',
          rawTitle: 'Other Link!',
          ticketUrl: 'https://tickets.example.org/other',
          eventUrl: 'https://manual.example.com/other',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const after = await rowFor('Own Link');
    expect(after.ticketUrl).toBe('https://tickets.example.org/own');
    expect(after.eventUrl).toBe('https://manual.example.com/own');
  });

  it('drops a listing whose merge target moved to another venue', async () => {
    const venue = await seedTestVenue();
    const elsewhere = await seedTestVenue();
    const date = futureDate(25);

    mockExtraction([makeEvent('Moved Act', date)]);
    await crawlVenue(venue.id, mockBrowser);
    const gone = await rowFor('Moved Act');
    const [target] = await db
      .insert(events)
      .values({
        venueId: elsewhere.id,
        title: 'Moved Act at the new room',
        artist: 'Moved Act (new room)',
        canonicalArtist: 'moved act new room',
        canonicalTitle: 'moved act at the new room',
        date,
      })
      .returning();
    if (!target) throw new Error('target insert returned no row');
    await mergeEventRows({
      sourceId: gone.id,
      targetId: target.id,
      actorId: 'user_admin',
      suggestion: null,
      notifyWatchers: false,
    });

    mockExtraction(
      [
        makeEvent('Moved Act', date, {
          title: 'MOVED TO THE NEW ROOM',
          rawTitle: 'MOVED TO THE NEW ROOM',
          ticketUrl: 'https://tickets.example.org/old-room',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const atOldVenue = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.venueId, venue.id));
    expect(atOldVenue).toEqual([]);
    const [after] = await db
      .select()
      .from(events)
      .where(eq(events.id, target.id));
    expect(after?.ticketUrl).toBeNull();
    expect(after?.lastSeenAt.getTime()).toBe(target.lastSeenAt.getTime());
  });

  it('inserts the listing again when the merge target has since been cancelled', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(23);

    mockExtraction([makeEvent('Relisted', date), makeEvent('Kept Row', date)]);
    await crawlVenue(venue.id, mockBrowser);
    const kept = await rowFor('Kept Row');
    const gone = await rowFor('Relisted');
    await mergeEventRows({
      sourceId: gone.id,
      targetId: kept.id,
      actorId: 'user_admin',
      suggestion: null,
      notifyWatchers: false,
    });
    await db
      .update(events)
      .set({ status: 'cancelled' })
      .where(eq(events.id, kept.id));

    mockExtraction(
      [
        makeEvent('Relisted', date, {
          title: 'Relisted!',
          rawTitle: 'Relisted!',
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const relisted = await rowFor('Relisted');
    expect(relisted.id).not.toBe(gone.id);
    expect(relisted.status).toBe('upcoming');
    expect((await rowFor('Kept Row')).status).toBe('cancelled');
  });
});

// Admin 4a-2: every writer of the bill rebuilds `event_artists` from it.
async function lineupOf(eventId: string) {
  return db
    .select({
      canonicalName: artists.canonicalName,
      role: eventArtists.role,
      position: eventArtists.position,
    })
    .from(eventArtists)
    .innerJoin(artists, eq(artists.id, eventArtists.artistId))
    .where(eq(eventArtists.eventId, eventId))
    .orderBy(asc(eventArtists.position));
}

describe('event_artists from the crawl and the cleanup (admin 4a-2)', () => {
  it('a crawl writes the lineup rows of the show it lists, headliner first', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);

    mockExtraction([
      makeEvent('Lineup Band', date, {
        observedPerformers: ['Lineup Band'],
        observedSupportingArtists: ['A Opener', 'B Opener'],
      }),
    ]);
    await crawlVenue(venue.id, mockBrowser);

    const row = await rowFor('Lineup Band');
    expect(await lineupOf(row.id)).toEqual([
      { canonicalName: 'lineup band', role: 'headliner', position: 0 },
      { canonicalName: 'a opener', role: 'support', position: 1 },
      { canonicalName: 'b opener', role: 'support', position: 2 },
    ]);
  });

  it('clears the lineup rows of a listing the crawl now reads as not a concert', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);
    const bill = {
      observedPerformers: ['Turned Bingo'],
      observedSupportingArtists: ['Bingo Opener'],
    };

    mockExtraction([makeEvent('Turned Bingo', date, bill)]);
    await crawlVenue(venue.id, mockBrowser);
    const row = await rowFor('Turned Bingo');
    expect(await lineupOf(row.id)).toHaveLength(2);

    mockExtraction(
      [
        makeEvent('Turned Bingo', date, {
          ...bill,
          title: 'Turned Bingo Night',
          rawTitle: 'Turned Bingo Night',
          isConcert: false,
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    expect(await lineupOf(row.id)).toEqual([]);
  });

  it('clears the lineup rows of a listing an admin hid', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);
    const listing = makeEvent('Hidden Later', date, {
      observedPerformers: ['Hidden Later'],
    });

    mockExtraction([listing]);
    await crawlVenue(venue.id, mockBrowser);
    const row = await rowFor('Hidden Later');
    expect(await lineupOf(row.id)).toHaveLength(1);
    await db
      .update(events)
      .set({ hiddenFromConsumer: true })
      .where(eq(events.id, row.id));

    // Same listing, so the row is not upserted; it is still cleared.
    mockExtraction([listing], `${HTML_BASE}<!-- 2 -->`);
    await crawlVenue(venue.id, mockBrowser);

    expect(await lineupOf(row.id)).toEqual([]);
  });

  it('relinks an unchanged listing only when it names an artist created this run', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);
    const relinked = makeEvent('Relink Act', date, {
      observedPerformers: ['Relink Act'],
      observedSupportingArtists: ['Gone Opener'],
    });
    const untouched = makeEvent('Steady Act', date, {
      observedPerformers: ['Steady Act'],
    });

    mockExtraction([relinked, untouched]);
    await crawlVenue(venue.id, mockBrowser);
    const relinkedRow = await rowFor('Relink Act');
    const untouchedRow = await rowFor('Steady Act');

    // The opener's artist row disappears (its lineup row cascades); the
    // steady act's lineup row is removed while its artist stays.
    await db.delete(artists).where(eq(artists.canonicalName, 'gone opener'));
    await db
      .delete(eventArtists)
      .where(eq(eventArtists.eventId, untouchedRow.id));

    // Same listings, so neither row is upserted.
    mockExtraction([relinked, untouched], `${HTML_BASE}<!-- 2 -->`);
    await crawlVenue(venue.id, mockBrowser);

    expect(await lineupOf(relinkedRow.id)).toEqual([
      { canonicalName: 'relink act', role: 'headliner', position: 0 },
      { canonicalName: 'gone opener', role: 'support', position: 1 },
    ]);
    // Created nothing it names, so it is not re-offered (the backfill's job).
    expect(await lineupOf(untouchedRow.id)).toEqual([]);
  });

  it('a re-crawl keeps the lineup rows of a lineup an admin saved', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);

    mockExtraction([
      makeEvent('Saved Rows', date, {
        observedPerformers: ['Saved Rows'],
        observedSupportingArtists: ['Venue Opener'],
      }),
    ]);
    await crawlVenue(venue.id, mockBrowser);
    await db.insert(artists).values({
      name: 'Admin Opener',
      canonicalName: 'admin opener',
      slug: 'admin-opener',
    });
    await db
      .update(events)
      .set({
        supportingArtists: ['Admin Opener'],
        canonicalSupporting: ['admin opener'],
        lineupEditedAt: new Date(),
      })
      .where(eq(events.artist, 'Saved Rows'));

    // A title change moves the source hash, so the row reaches the upsert.
    mockExtraction(
      [
        makeEvent('Saved Rows', date, {
          title: 'Saved Rows (Late)',
          rawTitle: 'Saved Rows (Late)',
          observedPerformers: ['Saved Rows'],
          observedSupportingArtists: ['Venue Opener'],
        }),
      ],
      `${HTML_BASE}<!-- 2 -->`,
    );
    await crawlVenue(venue.id, mockBrowser);

    const row = await rowFor('Saved Rows');
    expect(await lineupOf(row.id)).toEqual([
      { canonicalName: 'saved rows', role: 'headliner', position: 0 },
      { canonicalName: 'admin opener', role: 'support', position: 1 },
    ]);
  });

  it('the duplicate-night cleanup writes the lineup rows of a bill it fills', async () => {
    const venue = await seedTestVenue();
    const date = futureDate(22);
    await db.insert(artists).values([
      { name: 'Fill Act', canonicalName: 'fill act', slug: 'fill-act' },
      {
        name: 'Fill Opener',
        canonicalName: 'fill opener',
        slug: 'fill-opener',
      },
    ]);
    const [survivor, donor] = await db
      .insert(events)
      .values([
        {
          venueId: venue.id,
          title: 'Fill Act',
          artist: 'Fill Act',
          canonicalArtist: 'fill act',
          canonicalTitle: 'fill act',
          date,
          showTime: '20:00',
          // The ladder never ruled on this row: an empty bill to fill.
          headliners: null,
          canonicalHeadliners: null,
        },
        {
          venueId: venue.id,
          title: 'Fill Act',
          artist: 'Fill Act',
          canonicalArtist: 'fill act',
          canonicalTitle: 'fill act',
          date,
          showTime: null,
          headliners: ['Fill Act'],
          canonicalHeadliners: ['fill act'],
          supportingArtists: ['Fill Opener'],
          canonicalSupporting: ['fill opener'],
        },
      ])
      .returning({ id: events.id });
    if (!survivor || !donor) throw new Error('insert returned no rows');

    await mergeDuplicateNights({ dryRun: false });

    const rows = await db
      .select({ id: events.id, headliners: events.headliners })
      .from(events)
      .where(eq(events.venueId, venue.id));
    expect(rows).toEqual([{ id: survivor.id, headliners: ['Fill Act'] }]);
    expect(await lineupOf(survivor.id)).toEqual([
      { canonicalName: 'fill act', role: 'headliner', position: 0 },
      { canonicalName: 'fill opener', role: 'support', position: 1 },
    ]);
  });
});
