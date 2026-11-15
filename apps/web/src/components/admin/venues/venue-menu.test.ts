import { describe, expect, it } from 'vitest';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { Eye, FlaskConical, RefreshCw, X } from 'lucide-react';
import { hiddenStateLine, venueMenuItems, venueMenuState } from './venue-menu';

const COPY = ADMIN_COPY.venueHeader;

const venue = (
  over: Partial<VenueWithCrawlHealth> = {},
): VenueWithCrawlHealth => ({
  id: 'venue-1',
  name: 'Ball Arena',
  slug: 'ball-arena',
  shortName: null,
  websiteUrl: 'https://ballarena.example.com',
  city: 'Denver',
  timezone: 'America/Denver',
  active: false,
  verified: true,
  verifiedBy: null,
  verifiedAt: null,
  lastCrawledAt: null,
  crawlNotes: null,
  crawlDelayMs: 3000,
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: null,
  consecutiveFailures: 0,
  blockedAt: null,
  crawlPausedAt: null,
  removedAt: null,
  extractionStrategy: null,
  contactEmail: null,
  priceUrl: null,
  ticketVendor: null,
  debugCaptureHtml: false,
  crawlMode: null,
  crawlModeSource: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  address: null,
  capacity: null,
  venueType: null,
  about: null,
  neighborhood: null,
  featured: false,
  lat: null,
  lng: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  crawlHealth: {
    sevenDayPercent: 100,
    sparkline: [],
    lastCrawledAt: null,
    avgDurationMs: null,
    eventsTracked: 0,
    consecutiveFails: 0,
  },
  hiddenAt: '2026-11-02T18:00:00.000Z',
  ...over,
});

describe('hiddenStateLine', () => {
  it('is null for a live venue', () => {
    expect(hiddenStateLine(venue({ active: true }))).toBeNull();
  });

  it('names who hid it, when and a listed reason', () => {
    expect(
      hiddenStateLine(
        venue({ hiddenByName: '@hugh', hiddenReason: 'not_music_venue' }),
      ),
    ).toBe('Hidden by @hugh, Nov 2: not a music venue.');
  });

  it('uses an Other note, trimmed, without its own full stop', () => {
    expect(
      hiddenStateLine(
        venue({
          hiddenByName: '@hugh',
          hiddenReason: 'other',
          hiddenNote: '  Renovation through March..  ',
        }),
      ),
    ).toBe('Hidden by @hugh, Nov 2: Renovation through March.');
  });

  it('drops a blank Other note', () => {
    expect(
      hiddenStateLine(
        venue({
          hiddenByName: '@hugh',
          hiddenReason: 'other',
          hiddenNote: ' ',
        }),
      ),
    ).toBe('Hidden by @hugh, Nov 2.');
  });

  it('says "Hidden since" with no name', () => {
    expect(hiddenStateLine(venue({ hiddenReason: 'venue_closed' }))).toBe(
      'Hidden since Nov 2: venue closed.',
    );
  });

  it('leaves the reason out when there is none', () => {
    expect(hiddenStateLine(venue({ hiddenReason: null }))).toBe(
      'Hidden since Nov 2.',
    );
    expect(
      hiddenStateLine(venue({ hiddenByName: '@hugh', hiddenReason: null })),
    ).toBe('Hidden by @hugh, Nov 2.');
  });

  it('has no record for a venue hidden before hides were stored', () => {
    expect(hiddenStateLine(venue({ hiddenAt: null }))).toBe(
      COPY.hiddenNoRecord,
    );
  });

  it('a taken-down venue reads its take-down line', () => {
    expect(
      hiddenStateLine(venue({ removedAt: '2026-11-03T18:00:00.000Z' })),
    ).toBe(COPY.takenDown('Nov 3'));
  });
});

describe('venueMenuState', () => {
  const PAUSED_AT = '2026-10-28T18:00:00.000Z';

  it('a reasonless pause at 3 failures is auto-paused', () => {
    expect(
      venueMenuState(
        venue({
          active: true,
          crawlPausedAt: PAUSED_AT,
          consecutiveFailures: 3,
        }),
      ),
    ).toBe('autoPaused');
  });

  it('a pause with a reason is a hand pause at any failure count', () => {
    expect(
      venueMenuState(
        venue({
          active: true,
          crawlPausedAt: PAUSED_AT,
          crawlPauseReason: 'site_broken_or_moved',
          consecutiveFailures: 5,
        }),
      ),
    ).toBe('paused');
  });

  it('taken down wins over hidden and live', () => {
    expect(venueMenuState(venue({ removedAt: PAUSED_AT }))).toBe('removed');
    expect(venueMenuState(venue({ active: true, removedAt: PAUSED_AT }))).toBe(
      'removed',
    );
  });
});

describe('venueMenuItems icons (A3/03/venue-menu-states)', () => {
  const noop = (): void => undefined;
  const ACT = {
    pause: noop,
    resume: noop,
    trial: noop,
    flagship: noop,
    hide: noop,
    takeDown: noop,
    show: noop,
    remove: noop,
  };
  const iconsOf = (over: Partial<VenueWithCrawlHealth>) =>
    Object.fromEntries(
      venueMenuItems(venue(over), ACT).map((item) => [item.key, item.icon]),
    );

  it('Resume is the refresh arrows and Hide is the eye', () => {
    const icons = iconsOf({
      active: true,
      crawlPausedAt: '2026-10-28T18:00:00.000Z',
    });
    expect(icons.resume).toBe(RefreshCw);
    expect(icons.hide).toBe(Eye);
    expect(icons['take-down']).toBe(X);
  });

  it('a hidden venue: Show is the eye, Resume the arrows, Delete and Take down are X', () => {
    const icons = iconsOf({ crawlPausedAt: '2026-10-28T18:00:00.000Z' });
    expect(Object.keys(icons)).toEqual([
      'show',
      'resume',
      'delete',
      'take-down',
    ]);
    expect(icons.show).toBe(Eye);
    expect(icons.resume).toBe(RefreshCw);
    expect(icons.delete).toBe(X);
    expect(icons['take-down']).toBe(X);
  });
});

describe('venueMenuItems: Try a re-crawl', () => {
  const PAUSED_AT = '2026-10-28T18:00:00.000Z';
  const noop = (): void => undefined;
  const ACT = {
    pause: noop,
    resume: noop,
    trial: noop,
    flagship: noop,
    hide: noop,
    takeDown: noop,
    show: noop,
    remove: noop,
  };
  const keysOf = (over: Partial<VenueWithCrawlHealth>) =>
    venueMenuItems(venue({ active: true, ...over }), ACT).map(
      (item) => item.key,
    );

  it('follows Resume on a hand-paused venue', () => {
    const items = venueMenuItems(
      venue({
        active: true,
        crawlPausedAt: PAUSED_AT,
        crawlPauseReason: 'waiting_on_permission',
      }),
      ACT,
    );
    expect(items.map((item) => item.key).slice(0, 2)).toEqual([
      'resume',
      'trial',
    ]);
    const trial = items[1]!;
    expect(trial.label).toBe('Try a re-crawl');
    expect(trial.hint).toBe(COPY.menu.tryRecrawlHint);
    expect(trial.icon).toBe(FlaskConical);
  });

  it('is offered on an auto-paused venue, whose Resume says to try it first', () => {
    const items = venueMenuItems(
      venue({
        active: true,
        crawlPausedAt: PAUSED_AT,
        consecutiveFailures: 3,
      }),
      ACT,
    );
    expect(items.map((item) => item.key)).toContain('trial');
    expect(items[0]!.hint).toBe(
      'Auto-paused after 3 failures. Try a re-crawl first.',
    );
  });

  it('is never offered while crawling', () => {
    expect(keysOf({})).not.toContain('trial');
  });

  it('is never offered on a blocked venue, whose hint drops the re-crawl', () => {
    const blocked = {
      crawlPausedAt: PAUSED_AT,
      consecutiveFailures: 3,
      blockedAt: '2026-10-29T18:00:00.000Z',
    };
    expect(keysOf(blocked)).not.toContain('trial');
    expect(
      venueMenuItems(venue({ active: true, ...blocked }), ACT)[0]!.hint,
    ).toBe('Auto-paused after 3 failures.');
  });

  it('is never offered where the API would refuse it: unverified or robots-disallowed', () => {
    const auto = { crawlPausedAt: PAUSED_AT, consecutiveFailures: 3 };
    expect(keysOf({ ...auto, verified: false })).not.toContain('trial');
    expect(keysOf({ ...auto, robotsTxtAllowed: false })).not.toContain('trial');
    // So the auto-paused line never points at a row that isn't there.
    expect(
      venueMenuItems(
        venue({ active: true, ...auto, robotsTxtAllowed: false }),
        ACT,
      )[0]!.hint,
    ).toBe('Auto-paused after 3 failures.');
  });

  it('is never offered on a hidden or taken-down venue', () => {
    expect(keysOf({ active: false, crawlPausedAt: PAUSED_AT })).not.toContain(
      'trial',
    );
    // A hidden auto-paused venue's Resume line stops at the failures.
    const hiddenResume = venueMenuItems(
      venue({ crawlPausedAt: PAUSED_AT, consecutiveFailures: 3 }),
      ACT,
    ).find((item) => item.key === 'resume');
    expect(hiddenResume?.hint).toBe('Auto-paused after 3 failures.');
    expect(
      keysOf({ active: false, crawlPausedAt: PAUSED_AT, removedAt: PAUSED_AT }),
    ).not.toContain('trial');
  });
});
