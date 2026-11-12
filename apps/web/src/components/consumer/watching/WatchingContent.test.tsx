// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WatchingShow } from '@concert-crawl/types';
import {
  MY_SHOWS_HEADER_RULE,
  MY_SHOWS_HEADER_RULE_STYLE,
} from '@/components/consumer/history/definitions/constants';

// The header is under test, not the rows or the tabs: both are stubbed so the
// list renders without a QueryClientProvider or a router.
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: undefined }),
}));
vi.mock('@/lib/queries/use-watch-toggle', () => ({
  useWatchToggle: () => ({ mutate: vi.fn() }),
}));
vi.mock('./WatchingRow', () => ({
  WatchingRow: () => <div data-testid="watching-row" />,
}));
vi.mock('@/components/consumer/history/MyShowsTabs', () => ({
  MyShowsTabs: () => <nav />,
}));

import { WatchingContent } from './WatchingContent';

afterEach(cleanup);

const show: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
  ticketLinks: null,
  savedAt: new Date().toISOString(),
  savedPrice: 45,
  currentPrice: 45,
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: new Date().toISOString(),
  priceObservedAt: null,
  genres: [],
  imageUrl: null,
  artistPhotoUrl: null,
  attendingAt: null,
};

describe('WatchingContent header rule (B+ `bp-m-watching_m`)', () => {
  it('draws the gradient hairline, not the plain border', () => {
    render(<WatchingContent initialShows={[show]} />);
    const header = screen.getByTestId('watching-header');
    expect(header.className).not.toContain('border-b');
    // The same recipe as Concerts, so the two tabs can never drift apart.
    expect(MY_SHOWS_HEADER_RULE_STYLE.backgroundImage).toBe(
      MY_SHOWS_HEADER_RULE,
    );
    expect(header.style.backgroundImage).toContain('var(--signal) 60%');
    expect(header.style.backgroundImage).toContain('var(--border) 75%');
    expect(header.style.backgroundSize).toBe('100% 1px');
    expect(header.style.backgroundPosition).toBe('left bottom');
    expect(header.style.backgroundRepeat).toBe('no-repeat');
  });
});
