// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PassportContent } from '../PassportContent';
import { ThemeProvider } from '@/theme';
import type { HistoryShow } from '@concert-crawl/types';

const entitlement = vi.hoisted(() => ({
  value: { isLoading: false, active: true },
}));

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement.value,
}));

// The locked state reaches for the plan through Clerk; the upgrade path itself
// belongs to HistoryLocked's own suite, so here it only has to render.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
}));

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}));

// jsdom implements neither half of the object-URL API. Captured so the stubs
// can be put back — Vitest shares a worker across files, so an unrestored
// global outlives this suite.
const objectUrlApi = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
    ),
  );
  URL.createObjectURL = vi.fn(() => 'blob:passport');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  URL.createObjectURL = objectUrlApi.create;
  URL.revokeObjectURL = objectUrlApi.revoke;
  entitlement.value = { isLoading: false, active: true };
});

const COPY = CONSUMER_COPY.passport;

const row = (
  id: string,
  date: string,
  over: Partial<HistoryShow> = {},
): HistoryShow => ({
  eventId: id,
  artist: `Artist ${id}`,
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: null,
  neighborhood: null,
  date,
  dateLabel: 'Thu, May 14',
  showTime: null,
  priceFinal: 22,
  genre: 'indie',
  attendingAt: `${date}T01:00:00Z`,
  ...over,
});

const PAST: HistoryShow[] = [row('a', '2026-05-14', { artist: 'Wednesday' })];

const ACTIVE = [
  { slug: 'larimer-lounge', name: 'Larimer Lounge' },
  { slug: 'globe-hall', name: 'Globe Hall' },
];

const renderContent = (props: Partial<Parameters<typeof PassportContent>[0]>) =>
  render(
    <ThemeProvider>
      <PassportContent
        past={PAST}
        upcoming={[]}
        activeVenues={ACTIVE}
        identity={{
          handle: 'hugh',
          city: 'Denver',
          avatarColor: null,
          year: 2026,
        }}
        today="2026-11-11"
        locked={false}
        scaRegion={false}
        {...props}
      />
    </ThemeProvider>,
  );

describe('PassportContent', () => {
  it('draws the booklet for an entitled user with stamps', () => {
    renderContent({});

    expect(
      screen.getByRole('region', { name: COPY.bookletLabel }),
    ).toBeInTheDocument();
    // Both booklet layouts render (CSS shows one), so each holds the stamp.
    expect(
      screen.getAllByRole('img', {
        name: 'Wednesday, Larimer Lounge, Thu, May 14',
      }),
    ).toHaveLength(2);
    expect(screen.getAllByText('@hugh')).toHaveLength(2);
  });

  // At 390 the booklet's pager is wider than the phone, and an auto grid
  // track grew to fit it (999px in a 358px column). The track and the cell
  // both have to allow shrinking for the booklet to stay on screen.
  it('keeps the booklet inside a phone-width column', () => {
    renderContent({});
    const book = screen.getByTestId('passport-booklet');
    expect(book).toHaveClass('min-w-0');
    expect(book.parentElement).toHaveClass('grid-cols-[minmax(0,1fr)]');
  });

  // Addendum 2 item 3 (Hugh, 2026-11-12), on the page the route renders: the
  // booklet's slots keep their tilt (−8°, 6°, 4°, −5°, repeating), and every
  // stamp outside the booklet (Up next, Venues collected) stays straight.
  it('tilts the booklet slots on the page and nothing outside the booklet', () => {
    const past = ['a', 'b', 'c', 'd', 'e'].map((id, index) =>
      row(id, `2026-05-${String(10 + index).padStart(2, '0')}`),
    );
    const { container } = renderContent({
      past,
      upcoming: [row('u', '2026-11-20')],
    });

    const booklet = screen.getByTestId('passport-booklet');
    const stack = booklet.querySelector('[data-booklet-layout="stack"]');
    const page1 = stack?.querySelector('[data-booklet-leaf="page-1"]');
    expect(page1).not.toBeNull();
    const slots = Array.from(
      page1?.querySelectorAll(
        '[data-booklet-stamp], [data-booklet-next], [data-booklet-empty]',
      ) ?? [],
    );
    expect(slots).toHaveLength(4);
    expect(
      slots.map((slot) =>
        slot instanceof HTMLElement ? slot.style.transform : null,
      ),
    ).toEqual([
      'rotate(-8deg)',
      'rotate(6deg)',
      'rotate(4deg)',
      'rotate(-5deg)',
    ]);

    // A tilt is a transform on a stamp's box. Shapes inside an SVG drawing
    // (IdentityArt turns its pattern with `rotate(180 200 200)`) are the art's
    // own geometry, not a tilt, so the sweep stops at each drawing's root.
    const outside = Array.from(container.querySelectorAll('*')).filter(
      (node) =>
        !booklet.contains(node) && node.parentElement?.closest('svg') == null,
    );
    expect(outside.length).toBeGreaterThan(0);
    outside.forEach((node) => {
      expect(node.getAttribute('style') ?? '').not.toMatch(/rotate/);
      expect(node.getAttribute('transform') ?? '').not.toMatch(/rotate/);
      expect(node.getAttribute('class') ?? '').not.toMatch(/rotate-/);
    });
  });

  it('counts Venues collected against the active venues', () => {
    renderContent({});

    expect(screen.getByText(COPY.collectedCount(1, 2))).toBeInTheDocument();
  });

  // The venue list is optional: when it failed there is no total to count
  // against, and "0 of 0" would be a claim rather than a gap.
  it('leaves Venues collected out when the active list is empty', () => {
    renderContent({ activeVenues: [] });

    expect(screen.queryByText(COPY.venuesCollected)).not.toBeInTheDocument();
  });

  it('puts the next show on the Up next stub and in the next slot', () => {
    renderContent({
      upcoming: [row('up', '2026-11-21', { artist: 'Marian Hill' })],
    });

    expect(screen.getByText(COPY.upNext)).toBeInTheDocument();
    expect(
      screen.getByText(`${COPY.nextStamp} · ${COPY.inDays(10)}`),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('img', {
        name: `${COPY.nextStamp}: Marian Hill, Larimer Lounge, Thu, May 14`,
      }),
    ).toHaveLength(2);
  });

  // The card follows the theme the browser is in, not the one last written to
  // the profile — otherwise switching themes leaves the passport behind.
  it('renders the PNG in the theme the reader is currently looking at', async () => {
    renderContent({});

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/passport/square?theme=electric'),
    );
    // Once, not twice: an un-themed first pass would render the card, throw it
    // away when the live theme resolved, and bounce the button back to
    // "Preparing…" in between.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // The server's 403 is the authoritative verdict — a client hook that still
  // reports `active` must not be able to paint the card behind it.
  it('locks on the server 403 even when the client thinks it is entitled', () => {
    renderContent({ locked: true });

    expect(
      screen.queryByRole('region', { name: COPY.bookletLabel }),
    ).not.toBeInTheDocument();
  });

  // The other direction: a token that downgraded mid-session leaves the server
  // fetch un-403'd while the plan no longer covers the feature.
  it('locks when the client entitlement has lapsed', () => {
    entitlement.value = { isLoading: false, active: false };
    renderContent({});

    expect(
      screen.queryByRole('region', { name: COPY.bookletLabel }),
    ).not.toBeInTheDocument();
  });

  // Not a locked state: the plan is fine, the stamp book is simply empty.
  it('shows the empty state rather than a blank card when nothing is attended', () => {
    renderContent({ past: [] });

    // The phone's card and the desktop block both render (CSS shows one).
    expect(screen.getAllByText(COPY.emptyTitle)).toHaveLength(2);
    const ctas = screen.getAllByRole('link', { name: COPY.emptyCta });
    expect(ctas).toHaveLength(2);
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '/events');
  });

  // Addendum 2 item 16, `passport-empty-d`: the open book with four empty
  // round slots, the ID page at 0 / 0 / —, the empty block beside it, every
  // venue greyed, and no Share or Save image until there is a stamp.
  it('draws the empty desktop Passport as the open book', () => {
    renderContent({ past: [] });
    const desktop = document.querySelector(
      '[data-passport-empty-layout="desktop"]',
    );
    expect(desktop).not.toBeNull();
    const spread = desktop!.querySelector('[data-booklet-layout="spread"]');
    expect(spread).not.toBeNull();
    expect(spread!.querySelector('[data-booklet-leaf="id"]')).not.toBeNull();
    expect(spread!.querySelectorAll('[data-booklet-empty]')).toHaveLength(4);
    expect(spread!.querySelector('[data-booklet-stamp]')).toBeNull();
    expect(spread).toHaveTextContent(COPY.pageLabel(1));
    // ID page: 0 nights, 0 venues, no top genre.
    const idPage = spread!.querySelector('[data-booklet-leaf="id"]');
    expect(idPage).toHaveTextContent('0');
    expect(idPage).toHaveTextContent('—');
    // One spread and no pager.
    expect(
      screen.queryByRole('button', { name: COPY.previousPage }),
    ).not.toBeInTheDocument();
    expect(
      desktop!.querySelector('[data-passport-empty="block"]'),
    ).not.toBeNull();
    expect(desktop).toHaveTextContent(COPY.collectedCount(0, 2));
    expect(
      desktop!.querySelectorAll('[data-venue-collected="no"]'),
    ).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: COPY.shareLabel }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.saveLabel)).not.toBeInTheDocument();
  });

  // Item 4: the NEXT ghost sits right after the newest stamp, so in an empty
  // book with a show ahead it takes the first slot.
  it('puts the NEXT ghost in the first slot of an empty book', () => {
    renderContent({
      past: [],
      upcoming: [row('up', '2026-11-21', { artist: 'Marian Hill' })],
    });
    const spread = document.querySelector(
      '[data-passport-empty-layout="desktop"] [data-booklet-layout="spread"]',
    );
    const slots = spread!.querySelectorAll(
      '[data-booklet-leaf="page-1"] > *:not(:last-child)',
    );
    expect(slots[0]).toHaveAttribute('data-booklet-next', 'up');
    expect(spread!.querySelectorAll('[data-booklet-empty]')).toHaveLength(3);
  });

  // Addendum 4 item 8, `passport-next-d` and `passport-next-m`: with a show
  // ahead and no stamps the open book shows at every width (the phone's empty
  // card is for a reader with nothing ahead either), and the subtitle names
  // the date of the first stamp.
  it('shows the open book at every width, with the first-stamp subtitle, when a show is ahead', () => {
    renderContent({
      past: [],
      upcoming: [row('up', '2026-11-21', { artist: 'Marian Hill' })],
    });
    const desktop = document.querySelector(
      '[data-passport-empty-layout="desktop"]',
    );
    // One layout for every width: no phone card, and the book is not gated
    // behind `sm`.
    expect(desktop?.className.split(' ')).toContain('grid');
    expect(desktop?.className.split(' ')).not.toContain('hidden');
    expect(
      document.querySelector('[data-passport-empty-layout="phone"]'),
    ).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const ghost = desktop!.querySelector<HTMLElement>(
      '[data-booklet-next="up"]',
    );
    expect(ghost).not.toBeNull();
    // Not stamped yet, so not tilted.
    expect(ghost!.style.transform).toBe('');
    // The "No stamps yet" block is for a reader with nothing ahead.
    expect(desktop!.querySelector('[data-passport-empty="block"]')).toBeNull();
    expect(desktop).toHaveTextContent(COPY.firstStampSubtitle('Nov 21'));
    expect(
      screen.queryByRole('button', { name: COPY.shareLabel }),
    ).not.toBeInTheDocument();
  });

  it('keeps the phone empty card when nothing is ahead either', () => {
    renderContent({ past: [], upcoming: [] });
    expect(
      document.querySelector('[data-passport-empty-layout="phone"]')?.className,
    ).toBe('sm:hidden');
  });

  // A resolving plan must not flash the lock screen at a Supporter.
  it('does not lock while the entitlement is still resolving', () => {
    entitlement.value = { isLoading: true, active: false };
    renderContent({});

    expect(
      screen.getByRole('region', { name: COPY.bookletLabel }),
    ).toBeInTheDocument();
  });
});
