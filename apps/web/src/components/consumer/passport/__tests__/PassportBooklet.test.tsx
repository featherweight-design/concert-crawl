// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PassportBooklet } from '../PassportBooklet';
import { UpNextStubs } from '../UpNextStubs';
import { VenuesCollected } from '../VenuesCollected';
import { bookletPages, collectedVenues } from '@/lib/passport/booklet';
import { passportStats } from '@/lib/passport/stats';
import { toAttendedShows } from '@/lib/passport/select-shows';

const COPY = CONSUMER_COPY.passport;

const mobile = vi.hoisted(() => ({ matches: false }));

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: mobile.matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mobile.matches = false;
});

const row = (index: number, over: Partial<HistoryShow> = {}): HistoryShow => {
  const date = `2026-03-${String(index + 1).padStart(2, '0')}`;
  return {
    eventId: `e${index}`,
    artist: `Artist ${index}`,
    artistPhotoUrl: null,
    venueName: 'Globe Hall',
    venueSlug: 'globe-hall',
    neighborhood: null,
    date,
    dateLabel: `Day ${index}`,
    showTime: null,
    priceFinal: null,
    genre: null,
    attendingAt: `${date}T01:00:00Z`,
    ...over,
  };
};

const IDENTITY = {
  handle: 'hugh',
  city: 'Denver',
  avatarColor: null,
  year: 2026,
};

const renderBooklet = (count: number, next: HistoryShow | null = null) => {
  const past = Array.from({ length: count }, (_, i) => row(i));
  return render(
    <PassportBooklet
      pages={bookletPages(past, next)}
      identity={IDENTITY}
      stats={passportStats(toAttendedShows(past))}
    />,
  );
};

const stampNames = () =>
  screen
    .queryAllByRole('img')
    .map((node) => node.getAttribute('aria-label'))
    .filter((name): name is string => name?.startsWith('Artist') ?? false);

describe('PassportBooklet', () => {
  it('opens on the identity page and page 1, with the code line', () => {
    renderBooklet(4);

    expect(screen.getByText('@hugh')).toBeInTheDocument();
    expect(
      screen.getByText('P<CCRAWL<<HUGH<<<<DENVER<<2026<<<4N4V'),
    ).toBeInTheDocument();
    expect(stampNames()).toHaveLength(4);
    expect(
      screen.getByText(`${COPY.spreadOf(1, 2)} · ${COPY.nextPageWaiting}`),
    ).toBeInTheDocument();
  });

  it('turns to the next spread and back', () => {
    renderBooklet(11);

    fireEvent.click(screen.getByRole('button', { name: COPY.nextPage }));
    expect(screen.queryByText('@hugh')).not.toBeInTheDocument();
    expect(stampNames()).toHaveLength(7);
    expect(screen.getByRole('button', { name: COPY.nextPage })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: COPY.previousPage }));
    expect(screen.getByText('@hugh')).toBeInTheDocument();
  });

  it('offers Jump to once the stamps run past the first spread', () => {
    renderBooklet(11);

    fireEvent.click(screen.getByRole('button', { name: '2 · 3' }));
    expect(screen.getByRole('button', { name: '2 · 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('has no Jump to while every stamp is on the first spread', () => {
    renderBooklet(4);

    expect(screen.queryByText(COPY.jumpTo)).not.toBeInTheDocument();
  });

  it('swipes one page at a time on a phone', () => {
    mobile.matches = true;
    const { container } = renderBooklet(11);

    expect(screen.getByText(COPY.swipeForPage(2))).toBeInTheDocument();
    const frame = container.querySelector('section > div');
    if (frame === null) throw new Error('no booklet frame');
    fireEvent.touchStart(frame, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 100 }] });

    expect(screen.queryByText('@hugh')).not.toBeInTheDocument();
    expect(stampNames()).toHaveLength(4);
    expect(screen.getByText(COPY.swipeForPage(3))).toBeInTheDocument();
  });

  it('draws the next show as the dashed slot after the last stamp', () => {
    renderBooklet(2, row(20, { artist: 'Marian Hill' }));

    const next = document.querySelector('[data-booklet-next]');
    expect(next).not.toBeNull();
    expect(next?.querySelector('[data-venue-stamp="dashed"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-booklet-empty]')).toHaveLength(1);
  });

  // B+ rule 4: one stamp everywhere. Every night is the VenueStamp, untilted.
  it('stamps every night with the venue stamp, never tilted', () => {
    renderBooklet(3);

    const stamps = document.querySelectorAll('[data-booklet-stamp]');
    expect(stamps).toHaveLength(3);
    stamps.forEach((stamp) => {
      expect(stamp.querySelector('[data-venue-stamp="solid"]')).not.toBeNull();
      expect(stamp.getAttribute('style') ?? '').not.toMatch(/rotate/);
    });
  });
});

describe('UpNextStubs', () => {
  it('draws two stubs and folds the rest into a link', () => {
    render(
      <UpNextStubs
        queue={[row(10), row(11), row(12), row(13)]}
        today="2026-03-01"
      />,
    );

    expect(document.querySelectorAll('[data-up-next-stub]')).toHaveLength(2);
    expect(
      screen.getByText(`${COPY.nextStamp} · ${COPY.inDays(10)}`),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.inDays(11))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: `${COPY.moreGoing(2)} →` }),
    ).toHaveAttribute('href', '/history');
  });

  it('says tonight for a show today', () => {
    expect(COPY.inDays(0)).toBe('Tonight');
    expect(COPY.inDays(1)).toBe('In 1 day');
  });

  it('draws nothing with nothing ahead', () => {
    const { container } = render(<UpNextStubs queue={[]} today="2026-03-01" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VenuesCollected', () => {
  it('lights stamped venues and counts them against the active total', () => {
    const result = collectedVenues(
      [
        { slug: 'bluebird-theater', name: 'Bluebird Theater' },
        { slug: 'globe-hall', name: 'Globe Hall' },
      ],
      [row(1)],
    );
    render(<VenuesCollected {...result} />);

    expect(screen.getByText(COPY.collectedCount(1, 2))).toBeInTheDocument();
    const tiles = document.querySelectorAll('[data-venue-collected]');
    expect(
      Array.from(tiles).map((tile) =>
        tile.getAttribute('data-venue-collected'),
      ),
    ).toEqual(['yes', 'no']);
  });
});
