import { describe, expect, it } from 'vitest';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { hiddenStateLine, venueMenuState } from './venue-menu';

const COPY = ADMIN_COPY.venueHeader;

const venue = (
  over: Partial<VenueWithCrawlHealth> = {},
): VenueWithCrawlHealth => ({
  id: 'venue-1',
  name: 'Ball Arena',
  slug: 'ball-arena',
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
