import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  headerLine,
  recrawlOff,
  runningSince,
  viewOnSiteHref,
  type HeaderVenue,
} from './venue-header-rules';

const COPY = ADMIN_COPY.venueHeader;

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

describe('viewOnSiteHref', () => {
  it('opens our public venue page', () => {
    expect(viewOnSiteHref(venue())).toBe('/venues/ogden-theatre');
  });

  it('has no page for a hidden venue', () => {
    expect(viewOnSiteHref(venue({ active: false }))).toBeNull();
  });

  it('has no page for a taken-down venue, even with `active` set', () => {
    expect(
      viewOnSiteHref(venue({ removedAt: '2026-11-02T18:00:00Z' })),
    ).toBeNull();
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

  it('reads when it started, in Mountain Time, on both widths', () => {
    expect(headerLine(venue(), false, STARTED)).toBe(COPY.startedAt('3:41 PM'));
    expect(headerLine(venue(), true, STARTED)).toBe('Started 3:41 PM');
  });

  it('still says why Re-crawl is off first', () => {
    expect(headerLine(venue({ verified: false }), false, STARTED)).toBe(
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
