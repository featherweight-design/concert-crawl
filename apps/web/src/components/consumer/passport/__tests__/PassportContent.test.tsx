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

    expect(screen.getByText(COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.emptyCta })).toHaveAttribute(
      'href',
      '/events',
    );
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
