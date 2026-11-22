import { describe, expect, it } from 'vitest';
import type { CrawlTrigger } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  headerLine,
  recrawlOff,
  recrawlProgress,
  runningSince,
  concertCrawlHref,
  venueSiteLink,
  type HeaderVenue,
  type RecrawlLine,
  type RecrawlProgress,
} from './venue-header-rules';

const COPY = ADMIN_COPY.venueHeader;

/** A re-crawl line in `state`, its progress from `base` with `over` on top. */
const lineOf = (
  state: RecrawlLine['state'],
  base: RecrawlProgress,
  over: Partial<RecrawlProgress> = {},
): RecrawlLine => ({ state, progress: { ...base, ...over } });

const venue = (over: Partial<HeaderVenue> = {}): HeaderVenue => ({
  active: true,
  verified: true,
  robotsTxtAllowed: true,
  crawlPausedAt: null,
  neighborhood: 'RiNo',
  slug: 'ogden-theatre',
  deleteBlockers: { pastShows: 0, upcomingShows: 1, watchers: 0 },
  ...over,
});

describe('recrawlOff', () => {
  it('is null for a live, verified, allowed, crawling venue', () => {
    expect(recrawlOff(venue())).toBeNull();
  });

  it('names hidden first, then unverified, then robots, then paused', () => {
    expect(
      recrawlOff(
        venue({
          active: false,
          verified: false,
          robotsTxtAllowed: false,
          crawlPausedAt: '2026-11-01T00:00:00Z',
        }),
      ),
    ).toBe('hidden');
    expect(
      recrawlOff(
        venue({
          verified: false,
          robotsTxtAllowed: false,
          crawlPausedAt: '2026-11-01T00:00:00Z',
        }),
      ),
    ).toBe('unverified');
    expect(
      recrawlOff(
        venue({
          robotsTxtAllowed: false,
          crawlPausedAt: '2026-11-01T00:00:00Z',
        }),
      ),
    ).toBe('robots');
    expect(recrawlOff(venue({ crawlPausedAt: '2026-11-01T00:00:00Z' }))).toBe(
      'paused',
    );
  });

  it('is off for an active but unverified venue, which the API refuses', () => {
    expect(recrawlOff(venue({ verified: false }))).toBe('unverified');
    expect(headerLine(venue({ verified: false }), false)).toBe(
      COPY.recrawlOff.unverified,
    );
  });

  it('treats robots "not checked yet" as allowed', () => {
    expect(recrawlOff(venue({ robotsTxtAllowed: null }))).toBeNull();
  });
});

describe('concertCrawlHref', () => {
  it('opens our public venue page', () => {
    expect(concertCrawlHref(venue())).toBe('/venues/ogden-theatre');
  });

  it('has no page for a hidden venue', () => {
    expect(concertCrawlHref(venue({ active: false }))).toBeNull();
  });

  it('has no page for a taken-down venue, even with `active` set', () => {
    expect(
      concertCrawlHref(venue({ removedAt: '2026-11-02T18:00:00Z' })),
    ).toBeNull();
  });
});

describe('venueSiteLink', () => {
  it('opens the origin of the crawl URL, never its calendar path', () => {
    expect(
      venueSiteLink({
        websiteUrl: 'https://www.ballarena.com/events/calendar?x=1',
      }),
    ).toEqual({ href: 'https://www.ballarena.com', host: 'ballarena.com' });
  });

  it('reads only the URL, so a hidden venue keeps it', () => {
    expect(venueSiteLink({ websiteUrl: 'https://ogden.com/feed' })).toEqual({
      href: 'https://ogden.com',
      host: 'ogden.com',
    });
  });

  it('has no link without a full http(s) URL', () => {
    expect(venueSiteLink({ websiteUrl: '' })).toBeNull();
    expect(venueSiteLink({ websiteUrl: 'ogden.com' })).toBeNull();
    expect(venueSiteLink({ websiteUrl: 'javascript:alert(1)' })).toBeNull();
  });
});

describe('recrawlOff — taken down', () => {
  it('reads a taken-down venue as removed, even with `active` set', () => {
    expect(recrawlOff(venue({ removedAt: '2026-11-02T18:00:00Z' }))).toBe(
      'removed',
    );
    expect(
      recrawlOff(venue({ active: false, removedAt: '2026-11-02T18:00:00Z' })),
    ).toBe('removed');
  });

  // Show is refused on a taken-down venue, so the line never points at it.
  it('never tells a taken-down venue to show it on the site', () => {
    const takenDown = venue({
      active: false,
      removedAt: '2026-11-02T18:00:00Z',
    });
    expect(headerLine(takenDown, false)).toBe(COPY.recrawlOff.removed);
    expect(headerLine(takenDown, true)).toBe(COPY.recrawlOff.removed);
  });
});

describe('a running re-crawl', () => {
  // 3:41 PM in Denver on Nov 12.
  const STARTED = '2026-11-12T22:41:00.000Z';
  // A later progress write, which moves `updatedAt` on.
  const PROGRESSED = '2026-11-12T22:44:00.000Z';

  const running = (over: Partial<RecrawlProgress> = {}): RecrawlLine =>
    lineOf(
      'running',
      {
        startedAt: STARTED,
        pagesDone: 2,
        pagesTotal: 4,
        runningAhead: false,
        waitMs: null,
      },
      over,
    );

  it('reads the page and when it started, as the board draws it', () => {
    expect(headerLine(venue(), false, running())).toBe(
      'Page 2 of 4 · started 3:41 PM',
    );
  });

  it('reads the start alone until the page count is known', () => {
    expect(headerLine(venue(), false, running({ pagesTotal: null }))).toBe(
      'Started 3:41 PM',
    );
    expect(
      headerLine(venue(), false, running({ pagesDone: null, pagesTotal: 0 })),
    ).toBe('Started 3:41 PM');
  });

  it('never reads a page past the total', () => {
    expect(headerLine(venue(), false, running({ pagesDone: 5 }))).toBe(
      'Page 4 of 4 · started 3:41 PM',
    );
    expect(headerLine(venue(), false, running({ pagesDone: null }))).toBe(
      'Page 0 of 4 · started 3:41 PM',
    );
  });

  it('keeps the venue’s line until a start time is read', () => {
    expect(headerLine(venue(), false, running({ startedAt: null }))).toBe(
      `RiNo · ${COPY.upcoming(1)}`,
    );
    expect(
      headerLine(venue(), false, { state: 'running', progress: null }),
    ).toBe(`RiNo · ${COPY.upcoming(1)}`);
  });

  it('adds nothing to the phone line, where it isn’t drawn', () => {
    expect(headerLine(venue(), true, running())).toBe('');
  });

  it('still says why Re-crawl is off first', () => {
    expect(headerLine(venue({ verified: false }), false, running())).toBe(
      COPY.recrawlOff.unverified,
    );
  });

  it('takes the start from a processing trigger only', () => {
    expect(runningSince({ status: 'processing', updatedAt: STARTED })).toBe(
      STARTED,
    );
    expect(runningSince({ status: 'pending', updatedAt: STARTED })).toBeNull();
    expect(
      runningSince({ status: 'processing', updatedAt: 'soon' }),
    ).toBeNull();
  });

  it('prefers the claim’s `startedAt` over a later `updatedAt`', () => {
    expect(
      runningSince({
        status: 'processing',
        startedAt: STARTED,
        updatedAt: PROGRESSED,
      }),
    ).toBe(STARTED);
  });

  // A row from before migration 0121 has no `startedAt`.
  it('falls back to `updatedAt` only before the first progress write', () => {
    // No progress write yet, so `updatedAt` is still the claim time.
    expect(
      runningSince({
        status: 'processing',
        startedAt: null,
        progressAt: null,
        updatedAt: STARTED,
      }),
    ).toBe(STARTED);
    expect(
      runningSince({
        status: 'processing',
        startedAt: null,
        updatedAt: STARTED,
      }),
    ).toBe(STARTED);
    // A progress write moved `updatedAt` on: the start is unknown.
    expect(
      runningSince({
        status: 'processing',
        startedAt: null,
        progressAt: PROGRESSED,
        updatedAt: PROGRESSED,
      }),
    ).toBeNull();
    expect(
      headerLine(
        venue(),
        false,
        lineOf(
          'running',
          recrawlProgress({
            status: 'processing',
            startedAt: null,
            progressAt: PROGRESSED,
            updatedAt: PROGRESSED,
            pagesDone: 2,
            pagesTotal: 4,
          }),
        ),
      ),
    ).toBe(`RiNo · ${COPY.upcoming(1)}`);
  });
});

describe('a queued re-crawl', () => {
  const queued = (over: Partial<RecrawlProgress> = {}): RecrawlLine =>
    lineOf(
      'queued',
      {
        startedAt: null,
        pagesDone: null,
        pagesTotal: null,
        runningAhead: true,
        waitMs: 2 * 60_000,
      },
      over,
    );

  it('reads the run ahead and about how long, as the board draws it', () => {
    expect(headerLine(venue(), false, queued())).toBe(
      'Starts after the run in progress · about 2 min',
    );
  });

  it('rounds the wait to whole minutes, never under one', () => {
    expect(headerLine(venue(), false, queued({ waitMs: 150_000 }))).toBe(
      'Starts after the run in progress · about 3 min',
    );
    expect(headerLine(venue(), false, queued({ waitMs: 5_000 }))).toBe(
      'Starts after the run in progress · about 1 min',
    );
  });

  it('leaves the wait off when it is unknown', () => {
    expect(headerLine(venue(), false, queued({ waitMs: null }))).toBe(
      'Starts after the run in progress',
    );
  });

  it('keeps the venue’s line when nothing is running ahead', () => {
    expect(headerLine(venue(), false, queued({ runningAhead: false }))).toBe(
      `RiNo · ${COPY.upcoming(1)}`,
    );
    expect(
      headerLine(venue(), false, { state: 'queued', progress: null }),
    ).toBe(`RiNo · ${COPY.upcoming(1)}`);
  });

  it('adds nothing to the phone line', () => {
    expect(headerLine(venue(), true, queued())).toBe('');
  });
});

describe('recrawlProgress', () => {
  const trigger: Pick<CrawlTrigger, 'status' | 'updatedAt'> = {
    status: 'pending',
    updatedAt: '2026-11-12T22:40:00.000Z',
  };

  it('reads the run ahead and the wait off a pending trigger', () => {
    expect(
      recrawlProgress({
        ...trigger,
        progress: {
          queuePosition: 0,
          runningAhead: true,
          estimateMs: null,
          waitMs: 90_000,
        },
      }),
    ).toEqual({
      startedAt: null,
      pagesDone: null,
      pagesTotal: null,
      runningAhead: true,
      waitMs: 90_000,
    });
  });

  it('reads the pages and start off a processing trigger', () => {
    expect(
      recrawlProgress({
        status: 'processing',
        startedAt: '2026-11-12T22:41:00.000Z',
        updatedAt: '2026-11-12T22:44:00.000Z',
        pagesDone: 2,
        pagesTotal: 4,
      }),
    ).toEqual({
      startedAt: '2026-11-12T22:41:00.000Z',
      pagesDone: 2,
      pagesTotal: 4,
      runningAhead: false,
      waitMs: null,
    });
  });

  it('drops counts and waits that aren’t numbers it can read', () => {
    expect(
      recrawlProgress({
        ...trigger,
        pagesDone: -1,
        pagesTotal: 2.5,
        progress: {
          queuePosition: 0,
          runningAhead: false,
          estimateMs: null,
          waitMs: -5,
        },
      }),
    ).toMatchObject({ pagesDone: null, pagesTotal: null, waitMs: null });
  });
});

describe('headerLine', () => {
  it('reads the neighbourhood and one upcoming show', () => {
    expect(headerLine(venue(), false)).toBe(`RiNo · ${COPY.upcoming(1)}`);
  });

  it('leaves out a missing neighbourhood or count', () => {
    expect(headerLine(venue({ neighborhood: null }), false)).toBe(
      COPY.upcoming(1),
    );
    const noCounts: HeaderVenue = {
      active: true,
      verified: true,
      robotsTxtAllowed: true,
      crawlPausedAt: null,
      neighborhood: null,
      slug: 'ogden-theatre',
    };
    expect(headerLine(noCounts, false)).toBe('');
  });

  it('is empty on the phone unless Re-crawl is off', () => {
    expect(headerLine(venue(), true)).toBe('');
    expect(headerLine(venue({ active: false }), true)).toBe(
      COPY.recrawlOff.hidden,
    );
  });
});
