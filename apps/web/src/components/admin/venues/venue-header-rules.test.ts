import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  headerLine,
  recrawlOff,
  showsViewOnSite,
  type HeaderVenue,
} from './venue-header-rules';

const COPY = ADMIN_COPY.venueHeader;

const venue = (over: Partial<HeaderVenue> = {}): HeaderVenue => ({
  active: true,
  robotsTxtAllowed: true,
  crawlPausedAt: null,
  neighborhood: 'RiNo',
  deleteBlockers: { pastShows: 0, upcomingShows: 1, watchers: 0 },
  ...over,
});

describe('recrawlOff', () => {
  it('is null for a live, allowed, crawling venue', () => {
    expect(recrawlOff(venue())).toBeNull();
  });

  it('names hidden first, then robots, then paused', () => {
    expect(
      recrawlOff(
        venue({
          active: false,
          robotsTxtAllowed: false,
          crawlPausedAt: '2026-11-01T00:00:00Z',
        }),
      ),
    ).toBe('hidden');
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

  it('treats robots "not checked yet" as allowed', () => {
    expect(recrawlOff(venue({ robotsTxtAllowed: null }))).toBeNull();
  });
});

describe('showsViewOnSite', () => {
  it('hides it for a hidden venue', () => {
    expect(showsViewOnSite(venue({ active: false }))).toBe(false);
    expect(showsViewOnSite(venue())).toBe(true);
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
      robotsTxtAllowed: true,
      crawlPausedAt: null,
      neighborhood: null,
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
