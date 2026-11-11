// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PassportBooklet } from '../PassportBooklet';
import { UpNextStubs } from '../UpNextStubs';
import { VenuesCollected } from '../VenuesCollected';
import { bookletPages, collectedVenues } from '@/lib/passport/booklet';
import { passportStats } from '@/lib/passport/stats';
import { toAttendedShows } from '@/lib/passport/select-shows';

const COPY = CONSUMER_COPY.passport;

afterEach(() => {
  cleanup();
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

// Both layouts render and CSS shows one, so every query is scoped to a view.
const view = (layout: 'spread' | 'stack') => {
  const node = document.querySelector(`[data-booklet-layout="${layout}"]`);
  if (!(node instanceof HTMLElement)) throw new Error(`no ${layout} view`);
  return node;
};

const stampsIn = (layout: 'spread' | 'stack') =>
  view(layout).querySelectorAll('[data-booklet-stamp]').length;

const statusOf = (layout: 'spread' | 'stack') =>
  view(layout).querySelector('[data-booklet-status]')?.textContent;

const frameOf = (layout: 'spread' | 'stack') => {
  const frame = view(layout).firstElementChild;
  if (frame === null) throw new Error('no booklet frame');
  return frame;
};

const swipe = (from: [number, number], to: [number, number]) => {
  const frame = frameOf('stack');
  fireEvent.touchStart(frame, {
    touches: [{ clientX: from[0], clientY: from[1] }],
  });
  fireEvent.touchEnd(frame, {
    changedTouches: [{ clientX: to[0], clientY: to[1] }],
  });
};

describe('PassportBooklet', () => {
  it('opens on the identity page and page 1, with the code line', () => {
    renderBooklet(4);
    const spread = within(view('spread'));

    expect(spread.getByText('@hugh')).toBeInTheDocument();
    // Every fixture night is at Globe Hall, so the code line reads 4 nights, 1 venue.
    expect(
      spread.getByText('P<CCRAWL<<HUGH<<<<DENVER<<2026<<<4N1V'),
    ).toBeInTheDocument();
    expect(stampsIn('spread')).toBe(4);
    expect(statusOf('spread')).toBe(
      `${COPY.spreadOf(1, 2)} · ${COPY.nextPageWaiting}`,
    );
  });

  it('turns to the next spread and back', () => {
    renderBooklet(11);
    const spread = within(view('spread'));

    fireEvent.click(spread.getByRole('button', { name: COPY.nextPage }));
    expect(spread.queryByText('@hugh')).not.toBeInTheDocument();
    expect(stampsIn('spread')).toBe(7);
    expect(spread.getByRole('button', { name: COPY.nextPage })).toBeDisabled();

    fireEvent.click(spread.getByRole('button', { name: COPY.previousPage }));
    expect(spread.getByText('@hugh')).toBeInTheDocument();
  });

  it('names the Jump to buttons by the pages they open', () => {
    renderBooklet(11);
    const spread = within(view('spread'));

    expect(
      spread.getByRole('button', { name: COPY.jumpIdentityAndPage(1) }),
    ).toHaveTextContent('ID · 1');
    fireEvent.click(spread.getByRole('button', { name: COPY.jumpPages(2, 3) }));
    expect(
      spread.getByRole('button', { name: COPY.jumpPages(2, 3) }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no Jump to while every stamp is on the first spread', () => {
    renderBooklet(4);

    expect(screen.queryByText(COPY.jumpTo)).not.toBeInTheDocument();
  });

  it('swipes one page at a time on a phone', () => {
    renderBooklet(11);

    expect(statusOf('stack')).toBe(COPY.swipeForPage(2));
    swipe([300, 100], [100, 110]);

    expect(within(view('stack')).queryByText('@hugh')).not.toBeInTheDocument();
    expect(stampsIn('stack')).toBe(4);
    expect(statusOf('stack')).toBe(COPY.swipeForPage(3));
  });

  // A vertical scroll that drifts sideways must not turn the page.
  it('ignores a swipe that moves further down than across', () => {
    renderBooklet(11);

    swipe([300, 100], [200, 400]);

    expect(statusOf('stack')).toBe(COPY.swipeForPage(2));
    expect(within(view('stack')).getByText('@hugh')).toBeInTheDocument();
  });

  it('counts the whole booklet on the last page', () => {
    renderBooklet(11);

    swipe([300, 100], [100, 100]);
    swipe([300, 100], [100, 100]);

    expect(statusOf('stack')).toBe(COPY.pageNightsSoFar(3, 11));
  });

  // The two layouts group pages differently, so the booklet remembers a page,
  // not a spread index: a resize keeps the reader on what they were reading.
  it('keeps the same page when the layout changes', () => {
    renderBooklet(11);

    fireEvent.click(
      within(view('spread')).getByRole('button', { name: COPY.nextPage }),
    );
    // Desktop now opens on pages 2 and 3; the phone shows page 2.
    expect(statusOf('stack')).toBe(COPY.swipeForPage(3));

    swipe([300, 100], [100, 100]);
    // Phone on page 3; desktop still shows the spread that holds it.
    expect(statusOf('stack')).toBe(COPY.pageNightsSoFar(3, 11));
    expect(statusOf('spread')).toBe(COPY.spreadOf(2, 2));
  });

  it('draws the next show as the dashed slot after the last stamp', () => {
    renderBooklet(2, row(20, { artist: 'Marian Hill' }));

    const next = view('spread').querySelector('[data-booklet-next]');
    expect(next).not.toBeNull();
    expect(next?.querySelector('[data-venue-stamp="dashed"]')).not.toBeNull();
    expect(
      view('spread').querySelectorAll('[data-booklet-empty]'),
    ).toHaveLength(1);
  });

  // B+ rule 4: one stamp everywhere. Every night is the VenueStamp, and
  // nothing anywhere in the stamp, svg included, is turned.
  it('stamps every night with the venue stamp, never tilted', () => {
    renderBooklet(3);

    const stamps = view('spread').querySelectorAll('[data-booklet-stamp]');
    expect(stamps).toHaveLength(3);
    stamps.forEach((stamp) => {
      expect(stamp.querySelector('[data-venue-stamp="solid"]')).not.toBeNull();
      [stamp, ...Array.from(stamp.querySelectorAll('*'))].forEach((node) => {
        expect(node.getAttribute('transform') ?? '').not.toMatch(/rotate/);
        expect(node.getAttribute('style') ?? '').not.toMatch(/rotate/);
      });
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
