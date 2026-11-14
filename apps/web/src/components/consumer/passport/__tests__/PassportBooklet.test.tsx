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
import { BOOKLET_INNER_DASH, BookletStamp, slotTilt } from '../BookletStamp';
import {
  BOOKLET_FRAME,
  BOOKLET_SHADOW,
  BOOKLET_SPLIT_DASH,
  PassportBooklet,
  STAMP_SIZE,
} from '../PassportBooklet';
import { GHOST_SIZE, UpNextStubs } from '../UpNextStubs';
import { genreColor } from '@/lib/genre-color';
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
    venueCity: 'Denver',
    venueTimezone: 'America/Denver',
    rawShowTime: null,
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

describe('PassportIdPage since', () => {
  afterEach(cleanup);

  // `passport-next-d`: an empty book still reads "DENVER · SINCE SEP 2026".
  it('falls back to the month the account began when there is no stamp yet', () => {
    render(
      <PassportBooklet
        pages={bookletPages([], null)}
        identity={{ ...IDENTITY, joined: 'Sep 2026' }}
        stats={passportStats([])}
      />,
    );
    const id = document.querySelector('[data-booklet-leaf="id"]');
    expect(id).toHaveTextContent('Denver · SINCE Sep 2026');
  });

  it('prefers the first stamp once there is one', () => {
    const past = [row(0)];
    render(
      <PassportBooklet
        pages={bookletPages(past, null)}
        identity={{ ...IDENTITY, joined: 'Sep 2026' }}
        stats={passportStats(toAttendedShows(past))}
      />,
    );
    const id = document.querySelector('[data-booklet-leaf="id"]');
    expect(id).not.toHaveTextContent('Sep 2026');
    expect(id).toHaveTextContent('SINCE');
  });
});

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

    expect(statusOf('stack')).toBe(COPY.pageNights(3, 11));
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
    expect(statusOf('stack')).toBe(COPY.pageNights(3, 11));
    expect(statusOf('spread')).toBe(COPY.spreadOf(2, 2));
  });

  // Addendum 4 item 8: the kit's ghost_stamp, the venue's own tile in
  // greyscale, straight, with NEXT above and the date below.
  it('draws the next show as the greyscale ghost tile after the last stamp', () => {
    renderBooklet(2, row(20, { artist: 'Marian Hill' }));

    const next = view('spread').querySelector<HTMLElement>(
      '[data-booklet-next]',
    );
    expect(next).not.toBeNull();
    const ghost = next?.querySelector<HTMLElement>('[data-booklet-ghost]');
    expect(ghost).not.toBeNull();
    expect(ghost?.style.filter).toContain('grayscale');
    expect(ghost?.querySelector('[data-venue-stamp]')).toBeNull();
    expect(next?.style.transform).toBe('');
    expect(
      view('spread').querySelectorAll('[data-booklet-empty]'),
    ).toHaveLength(1);
  });

  // Addendum 2 item 3 (Hugh, 2026-11-12): one round venue stamp everywhere,
  // straight except inside the booklet, where each slot keeps its
  // hand-stamped tilt (−8°, 6°, 4°, −5°, repeating). Only the slot turns;
  // nothing inside the stamp is turned again.
  it('stamps every night with the venue stamp at its slot tilt', () => {
    renderBooklet(3);

    const stamps = view('spread').querySelectorAll('[data-booklet-stamp]');
    expect(stamps).toHaveLength(3);
    const tilts = ['-8deg', '6deg', '4deg'];
    stamps.forEach((stamp, index) => {
      expect(stamp.querySelector('[data-venue-glyph="globe"]')).not.toBeNull();
      expect(stamp.getAttribute('style') ?? '').toContain(
        `rotate(${tilts[index]})`,
      );
      Array.from(stamp.querySelectorAll('*')).forEach((node) => {
        expect(node.getAttribute('transform') ?? '').not.toMatch(/rotate/);
        expect(node.getAttribute('style') ?? '').not.toMatch(/rotate/);
      });
    });
    // The fourth slot, the NEXT ghost or an empty slot, keeps −5°.
    const fourth = view('spread').querySelector(
      '[data-booklet-next], [data-booklet-empty]',
    );
    expect(fourth?.getAttribute('style') ?? '').toContain('rotate(-5deg)');
  });
});

// The booklet stamp as `addendum-2/04/passport-{m,d}` draw it.
describe('BookletStamp face', () => {
  const stampOf = (show: HistoryShow, size = STAMP_SIZE) => {
    const { container } = render(<BookletStamp show={show} size={size} />);
    const stamp = container.querySelector<HTMLElement>('[data-booklet-stamp]');
    if (!stamp) throw new Error('no booklet stamp');
    return stamp;
  };

  it("is the board's 124px stamp", () => {
    expect(STAMP_SIZE).toBe(124);
    const stamp = stampOf(row(0));
    expect(stamp.style.width).toBe('124px');
    expect(stamp.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 124 124',
    );
  });

  it('draws a solid outer ring and a dashed inner ring, and no nested venue stamp', () => {
    const stamp = stampOf(row(0));
    const outer = stamp.querySelector('[data-booklet-ring]');
    const inner = stamp.querySelector('[data-booklet-inner-ring]');
    expect(outer?.getAttribute('r')).toBe('59');
    expect(outer?.getAttribute('stroke-width')).toBe('2.4');
    expect(outer?.getAttribute('stroke-dasharray')).toBeNull();
    expect(inner?.getAttribute('r')).toBe('52');
    expect(inner?.getAttribute('stroke-dasharray')).toBe(BOOKLET_INNER_DASH);
    expect(stamp.querySelector('[data-venue-stamp]')).toBeNull();
  });

  it('sets the date straight and only the artist on the arc', () => {
    const stamp = stampOf(row(0));
    const date = stamp.querySelector('[data-booklet-date]');
    expect(date?.textContent).toBe('MAR 01');
    expect(date?.querySelector('textPath')).toBeNull();
    expect(date?.getAttribute('y')).toBe('104.16');
    expect(date?.getAttribute('text-anchor')).toBe('middle');
    const paths = stamp.querySelectorAll('textPath');
    expect(paths).toHaveLength(1);
    expect(paths[0]?.textContent).toBe('ARTIST 0');
  });

  it("inks the stamp in its venue's colours, the same for any artist there", () => {
    // Bluebird on the board: ring and text #4DA3FF, glyph #7AE6FF.
    const bluebird = { venueSlug: 'bluebird-theater', venueName: 'Bluebird' };
    const first = stampOf(row(0, { ...bluebird, artist: 'Khruangbin' }));
    const second = stampOf(row(1, { ...bluebird, artist: 'Wednesday' }));
    for (const stamp of [first, second]) {
      expect(
        stamp.querySelector('[data-booklet-ring]')?.getAttribute('stroke'),
      ).toBe('#4DA3FF');
      expect(
        stamp.querySelector('[data-booklet-date]')?.getAttribute('fill'),
      ).toBe('#4DA3FF');
      expect(
        stamp
          .querySelector('[data-venue-glyph="bluebird"] > g')
          ?.getAttribute('stroke'),
      ).toBe('#7AE6FF');
      expect(stamp.style.filter).toContain('#4DA3FF4D');
      expect(stamp.style.opacity).toBe('0.95');
    }
  });

  it('keeps the slot tilts −8°, 6°, 4°, −5°, repeating every four', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(slotTilt)).toEqual([
      -8, 6, 4, -5, -8, 6, 4, -5,
    ]);
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

  // Audit row (`passport-m` UP NEXT): a 56px grey dashed ring holding the
  // greyed venue tile, with the date inside the ring.
  it('tears off a grey ghost of the stamp with the date inside its ring', () => {
    render(<UpNextStubs queue={[row(10)]} today="2026-03-01" />);
    const ghost = document.querySelector<HTMLElement>('[data-up-next-ghost]');
    if (!ghost) throw new Error('no ghost stamp');
    expect(ghost.style.width).toBe(`${GHOST_SIZE}px`);
    expect(GHOST_SIZE).toBe(56);
    expect(ghost.className).toContain('border-dashed');
    expect(ghost.className).toContain('border-border-strong');
    expect(ghost.style.borderWidth).toBe('1.5px');
    expect(ghost.querySelector('[data-up-next-ghost-date]')?.textContent).toBe(
      'MAR 11',
    );
    const tile = ghost.querySelector<HTMLElement>('[data-up-next-ghost-tile]');
    expect(tile?.style.filter).toBe('grayscale(1)');
    expect(tile?.style.opacity).toBe('0.45');
    expect(tile?.querySelector('[data-venue-tile="globe"]')).not.toBeNull();
    expect(ghost.querySelector('[data-venue-stamp]')).toBeNull();
  });

  it('rings the stub artwork in its genre colour', () => {
    render(
      <UpNextStubs queue={[row(10, { genre: 'indie' })]} today="2026-03-01" />,
    );
    const indie = genreColor('indie');
    if (indie === null) throw new Error('indie has no genre colour');
    expect(screen.getByTestId('up-next-art').style.boxShadow).toContain(indie);
  });
});

// Audit row (`passport-{m,d}`): the booklet frame and its page split.
describe('PassportBooklet frame', () => {
  it('draws the gradient hairline fading to the border, with the deep shadow', () => {
    renderBooklet(4);
    const frame = view('spread').firstElementChild;
    if (!(frame instanceof HTMLElement)) throw new Error('no frame');
    expect(frame.style.borderWidth).toBe('1px');
    expect(BOOKLET_FRAME).toContain(
      'linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
    );
    expect(BOOKLET_SHADOW).toBe('0 40px 100px rgba(0, 0, 0, 0.5)');
  });

  it('splits the pages with a 5-on 5-off dashed hairline in border-strong', () => {
    renderBooklet(4);
    expect(
      view('spread').querySelectorAll('[data-booklet-split]'),
    ).toHaveLength(1);
    expect(BOOKLET_SPLIT_DASH).toBe(
      'var(--border-strong) 0 5px, transparent 5px 10px',
    );
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
