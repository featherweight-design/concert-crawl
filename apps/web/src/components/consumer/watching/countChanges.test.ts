import { describe, expect, it } from 'vitest';
import type { WatchingShow } from '@concert-crawl/types';

import { countChanges } from './WatchingContent';

const show = (overrides: Partial<WatchingShow>): WatchingShow => ({
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
  ticketLinks: null,
  savedAt: '2026-11-01T00:00:00.000Z',
  savedPrice: null,
  currentPrice: null,
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: '2026-11-01T00:00:00.000Z',
  priceObservedAt: null,
  imageUrl: null,
  artistPhotoUrl: null,
  attendingAt: null,
  ...overrides,
});

describe('countChanges', () => {
  it('counts a sold-out upcoming show as sold out', () => {
    expect(countChanges([show({ watchStatus: 'soldout' })]).soldOut).toBe(1);
  });

  it("doesn't count a cancelled or postponed show as sold out", () => {
    expect(
      countChanges([
        show({ eventStatus: 'cancelled', watchStatus: 'soldout' }),
        show({ eventStatus: 'postponed', watchStatus: 'soldout' }),
        show({ eventStatus: 'cancelled' }),
      ]).soldOut,
    ).toBe(0);
  });
});
