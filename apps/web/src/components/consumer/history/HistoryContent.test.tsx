// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import type { HistoryResponse, HistoryShow } from '@concert-crawl/types';
import type { EntitlementResult } from '@/lib/queries/use-entitlement';

const entitlement: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
};

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement.current,
}));

// The route seeds the query from the server; the hook itself is exercised in
// its own suite, so here it only has to hand back what it was seeded with.
const query: { data: HistoryResponse | undefined } = { data: undefined };
vi.mock('@/lib/queries/use-history', () => ({
  useHistory: () => ({ data: query.data }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
  useUser: () => ({ user: { username: 'huey' } }),
}));

// The mutation itself is exercised in use-attending-toggle.test.tsx; here the
// list only has to call it with the right input and react to its callbacks.
const toggle = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutateAsync: toggle.mutateAsync }),
}));

const toasts = vi.hoisted(() => ({
  showRemovedToast: vi.fn(),
  showAttendanceError: vi.fn(),
}));
vi.mock('@/components/consumer/going/lib/attendance-toasts', () => toasts);

// Below sm the ⋯ goes straight to the confirm, which is what these tests drive.
vi.mock('@/lib/hooks/useIsMobileViewport', () => ({
  useIsMobileViewport: () => true,
}));

vi.mock('@/components/consumer/share/ShareSheet', () => ({
  ShareSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="share-sheet" /> : null,
}));

vi.mock('@/lib/history', () => ({
  downloadHistoryIcs: () => Promise.resolve(),
}));

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}));

vi.mock('./AddShowRow', () => ({
  AddShowRow: () => <div data-testid="add-show-row" />,
}));

import { HistoryContent } from './HistoryContent';
import { HISTORY_COPY } from './definitions/copy';
import { GOING_COPY } from '@/components/consumer/going/definitions/copy';

const show = (eventId: string, date: string): HistoryShow => ({
  eventId,
  artist: `Artist ${eventId}`,
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: null,
  date,
  dateLabel: 'Thu, May 14',
  showTime: null,
  priceFinal: 22,
  genre: 'indie',
  attendingAt: `${date}T02:00:00.000Z`,
  venueCity: 'Denver',
  venueTimezone: 'America/Denver',
  rawShowTime: null,
});

const year = new Date().getFullYear();

const RESPONSE: HistoryResponse = {
  past: [show('a', `${year}-05-14`), show('bb', `${year}-03-02`)],
  upcoming: [],
  stats: {
    nights: 2,
    venues: 1,
    artists: 2,
    topGenre: 'indie',
    topVenue: 'Larimer Lounge',
    first: `${year}-03-02`,
    last: `${year}-05-14`,
    totalSpent: 44,
  },
};

const EMPTY: HistoryResponse = {
  past: [],
  upcoming: [],
  stats: {
    nights: 0,
    venues: 0,
    artists: 0,
    topGenre: null,
    topVenue: null,
    first: null,
    last: null,
    totalSpent: null,
  },
};

afterEach(() => {
  cleanup();
  query.data = undefined;
  entitlement.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  };
});

describe('HistoryContent', () => {
  it('renders the takeover when the server reported the 403 lock', () => {
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    render(<HistoryContent initialData={null} locked scaRegion={false} />);

    expect(
      screen.getByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).toBeInTheDocument();
  });

  it('renders the takeover when the client plan lost the entitlement', () => {
    // Stale token that downgraded mid-session: the server said nothing, the
    // hook says no.
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    };
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    );

    expect(
      screen.getByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).toBeInTheDocument();
  });

  it('renders the empty state for an entitled user with no nights', () => {
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    );

    expect(screen.getByText(HISTORY_COPY.empty.headline)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).not.toBeInTheDocument();
  });

  // Not drawn: a reader with no nights is the one most likely to add one.
  it('offers the Add row under the empty state', () => {
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    );
    expect(screen.getByTestId('add-show-row')).toBeInTheDocument();
  });

  // B+ rule 4: the empty state shows unearned dashed venue stamps.
  it('draws dashed venue stamps above the empty state', () => {
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    );

    // The dashed card and the CONCERTS eyebrow (`bp-s-empty_concerts_m`).
    expect(screen.getByTestId('my-shows-empty-card').className).toContain(
      'border-dashed',
    );
    expect(screen.getByTestId('my-shows-empty-eyebrow')).toHaveTextContent(
      HISTORY_COPY.empty.eyebrow,
    );

    const stamps = screen
      .getByTestId('history-empty-stamps')
      .querySelectorAll('[data-venue-stamp]');
    expect(stamps).toHaveLength(3);
    for (const stamp of stamps) {
      expect(stamp).toHaveAttribute('data-venue-stamp', 'dashed');
    }
  });

  it('renders the populated list from initialData without a flash of empty', () => {
    // No client fetch has resolved yet — the server payload alone must render
    // the rows rather than the "nothing behind you" state.
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    expect(
      screen.queryByText(HISTORY_COPY.empty.headline),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Artist a')).toBeInTheDocument();
    expect(screen.getByText('Artist bb')).toBeInTheDocument();
  });

  it('prefers the refetched payload over the server seed once it lands', () => {
    query.data = { ...RESPONSE, past: [show('cc', `${year}-05-14`)] };
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    expect(screen.getByText('Artist cc')).toBeInTheDocument();
    expect(screen.queryByText('Artist a')).not.toBeInTheDocument();
  });

  it('holds the layout while the plan is still resolving', () => {
    entitlement.current = { isLoading: true, active: false, surface: null };
    render(
      <HistoryContent initialData={null} locked={false} scaRegion={false} />,
    );

    expect(
      screen.queryByText(HISTORY_COPY.empty.headline),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).not.toBeInTheDocument();
    // The sub-tabs stay put so the surface doesn't jump when data arrives.
    expect(
      screen.getByRole('navigation', { name: HISTORY_COPY.tabs.ariaLabel }),
    ).toBeInTheDocument();
  });

  it('groups the rows into reverse-chronological month buckets', () => {
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    expect(screen.getByText('May')).toBeInTheDocument();
    expect(screen.getByText('March')).toBeInTheDocument();
  });

  it('stacks the rail above the list on mobile and sticks it at lg', () => {
    // One component, one media query — not a second desktop tree.
    const { container } = render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    const rail = screen.getByTestId('history-rail');
    expect(rail.className).toContain('mb-4');
    expect(rail.className).toContain('lg:sticky');
    expect(rail.className).toContain('lg:mb-0');

    const grid = container.querySelector('.lg\\:grid');
    expect(grid).not.toBeNull();
    expect(grid?.className).toContain('lg:grid-cols-[1fr_320px]');
    expect(grid?.contains(rail)).toBe(true);

    // First in the DOM so the export and Passport sit above the list on mobile,
    // where the tail of a long history buried them. Explicit grid placement puts
    // the rail back in the right-hand column at lg.
    expect(grid?.firstElementChild).toBe(rail);
    expect(rail.className).toContain('lg:col-start-2');
    expect(rail.className).toContain('lg:row-start-1');
  });

  it('gives a show you are going to a home before its date (#1357)', () => {
    render(
      <HistoryContent
        initialData={{ ...RESPONSE, upcoming: [show('up', `${year}-12-20`)] }}
        locked={false}
        scaRegion={false}
      />,
    );

    expect(
      screen.getByRole('region', { name: HISTORY_COPY.sections.upcoming }),
    ).toHaveTextContent('Artist up');
    // The future show must not leak into Past.
    expect(
      screen.getByRole('region', { name: HISTORY_COPY.sections.past }),
    ).not.toHaveTextContent('Artist up');
  });

  // B+ rule 4: an upcoming night shows the dashed stamp it will become, and a
  // past one the solid stamp it earned.
  it('stamps Upcoming dashed and Past solid', () => {
    render(
      <HistoryContent
        initialData={{ ...RESPONSE, upcoming: [show('up', `${year}-12-20`)] }}
        locked={false}
        scaRegion={false}
      />,
    );

    const variants = (name: string) =>
      Array.from(
        screen
          .getByRole('region', { name })
          .querySelectorAll('[data-venue-stamp]'),
      ).map((stamp) => stamp.getAttribute('data-venue-stamp'));

    expect(new Set(variants(HISTORY_COPY.sections.upcoming))).toEqual(
      new Set(['dashed']),
    );
    expect(new Set(variants(HISTORY_COPY.sections.past))).toEqual(
      new Set(['solid']),
    );
  });

  it('names each empty half rather than hiding it, while the other has rows', () => {
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    // Nothing upcoming, but Past is populated, so this is a gap in a full
    // screen — the whole-surface empty state must stay away.
    expect(
      screen.getByText(HISTORY_COPY.sections.upcomingEmpty),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(HISTORY_COPY.empty.headline),
    ).not.toBeInTheDocument();
  });

  it('keeps the export past-only when only upcoming shows exist', () => {
    // The .ics is a record of nights that happened, so a future-only list has
    // nothing to export.
    render(
      <HistoryContent
        initialData={{ ...EMPTY, upcoming: [show('up', `${year}-12-20`)] }}
        locked={false}
        scaRegion={false}
      />,
    );

    expect(screen.getByTestId('history-rail')).toHaveTextContent(
      HISTORY_COPY.calendar.detailEmpty,
    );
  });

  it('mounts the calendar row and the Passport teaser in the rail', () => {
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    );

    const rail = screen.getByTestId('history-rail');
    expect(rail).toHaveTextContent(HISTORY_COPY.calendar.label);
    expect(rail).toHaveTextContent(HISTORY_COPY.passport.headline);
  });
});

describe('HistoryContent: taking a night out', () => {
  const renderWithUpcoming = () =>
    render(
      <HistoryContent
        initialData={{ ...RESPONSE, upcoming: [show('up', `${year}-12-20`)] }}
        locked={false}
        scaRegion={false}
      />,
    );

  const openMenuFor = (artist: string) => {
    fireEvent.click(
      screen.getByRole('button', {
        name: HISTORY_COPY.menu.trigger(artist),
      }),
    );
  };

  // ⋯, then Didn't make it? Remove, which opens the confirm.
  const openConfirmFor = (artist: string) => {
    openMenuFor(artist);
    fireEvent.click(
      screen.getByRole('menuitem', { name: HISTORY_COPY.menu.remove }),
    );
  };

  // ... and the confirm's own button.
  const confirmRemoval = (artist: string) => {
    openConfirmFor(artist);
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.confirm }),
    );
  };

  afterEach(() => {
    toggle.mutateAsync.mockReset();
    toasts.showRemovedToast.mockReset();
    toasts.showAttendanceError.mockReset();
  });

  it('gives a menu to past rows and to upcoming rows', () => {
    renderWithUpcoming();

    expect(screen.getAllByTestId('row-menu')).toHaveLength(3);
    expect(
      screen.getByRole('button', {
        name: HISTORY_COPY.menu.trigger('Artist up'),
      }),
    ).toHaveAttribute('data-tense', 'upcoming');
  });

  it('asks before removing a past night, and Keep it removes nothing', () => {
    renderWithUpcoming();
    openConfirmFor('Artist a');

    expect(
      screen.getByRole('dialog', { name: GOING_COPY.remove.title }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.keep }),
    );

    expect(toggle.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('releases the night on confirm and keeps the sheet open, reading Removing…, until the server answers', () => {
    // Never settles: the remove is still in flight.
    toggle.mutateAsync.mockReturnValue(new Promise(() => {}));
    renderWithUpcoming();
    confirmRemoval('Artist a');

    expect(toggle.mutateAsync).toHaveBeenCalledTimes(1);
    expect(toggle.mutateAsync.mock.calls[0]?.[0]).toEqual({
      eventId: 'a',
      going: false,
    });
    expect(
      screen.getByRole('button', { name: GOING_COPY.remove.busy }),
    ).toBeDisabled();
  });

  it('closes the sheet once the remove succeeds', async () => {
    toggle.mutateAsync.mockResolvedValue({ going: false, restore: null });
    renderWithUpcoming();
    confirmRemoval('Artist a');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: GOING_COPY.remove.title }),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows the failure in the sheet, not a toast, and Try again sends it again', async () => {
    toggle.mutateAsync.mockRejectedValue(new Error('offline'));
    renderWithUpcoming();
    confirmRemoval('Artist a');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      GOING_COPY.remove.failed,
    );
    expect(toasts.showAttendanceError).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: GOING_COPY.remove.retry }),
    );
    expect(toggle.mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('takes an upcoming night out with no confirm, and toasts with Undo', async () => {
    const restore = { attendingAt: '2026-12-01T02:00:00.000Z', token: 't2' };
    toggle.mutateAsync.mockResolvedValue({ going: false, restore });
    renderWithUpcoming();
    openMenuFor('Artist up');
    fireEvent.click(
      screen.getByRole('menuitem', {
        // On a phone the item's name carries its subline too.
        name: new RegExp(`^${HISTORY_COPY.menu.removeUpcoming}`),
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle.mutateAsync.mock.calls[0]?.[0]).toEqual({
      eventId: 'up',
      going: false,
    });

    await waitFor(() => expect(toasts.showRemovedToast).toHaveBeenCalled());
    expect(toasts.showRemovedToast.mock.calls[0]?.[0].artist).toBe('Artist up');
    expect(toasts.showRemovedToast.mock.calls[0]?.[0].onUndo).toBeTypeOf(
      'function',
    );
  });

  it('raises the save failure as a toast when an upcoming release fails', async () => {
    toggle.mutateAsync.mockRejectedValue(new Error('offline'));
    renderWithUpcoming();
    openMenuFor('Artist up');
    fireEvent.click(
      screen.getByRole('menuitem', {
        // On a phone the item's name carries its subline too.
        name: new RegExp(`^${HISTORY_COPY.menu.removeUpcoming}`),
      }),
    );

    await waitFor(() =>
      expect(toasts.showAttendanceError).toHaveBeenCalledWith('save'),
    );
  });

  it('keeps both toasts and restore tokens when two nights are removed in a row', async () => {
    const first = { attendingAt: '2026-05-14T02:00:00.000Z', token: 'a1' };
    const second = { attendingAt: '2026-03-02T02:00:00.000Z', token: 'b1' };
    toggle.mutateAsync
      .mockResolvedValueOnce({ going: false, restore: first })
      .mockResolvedValueOnce({ going: false, restore: second });
    renderWithUpcoming();

    confirmRemoval('Artist a');
    await waitFor(() =>
      expect(toasts.showRemovedToast).toHaveBeenCalledTimes(1),
    );
    confirmRemoval('Artist bb');
    await waitFor(() =>
      expect(toasts.showRemovedToast).toHaveBeenCalledTimes(2),
    );

    expect(toasts.showRemovedToast.mock.calls[0]?.[0].artist).toBe('Artist a');
    expect(toasts.showRemovedToast.mock.calls[1]?.[0].artist).toBe('Artist bb');
  });

  it('opens Share this night from the menu', () => {
    renderWithUpcoming();
    openMenuFor('Artist a');
    fireEvent.click(
      screen.getByRole('menuitem', { name: HISTORY_COPY.menu.share }),
    );

    expect(screen.getByTestId('share-sheet')).toBeInTheDocument();
  });

  it('toasts with Undo that sends the restore token back', async () => {
    const restore = { attendingAt: '2026-05-14T02:00:00.000Z', token: 't1' };
    toggle.mutateAsync.mockResolvedValue({ going: false, restore });
    renderWithUpcoming();
    confirmRemoval('Artist a');

    await waitFor(() => expect(toasts.showRemovedToast).toHaveBeenCalled());
    const { artist, onUndo } = toasts.showRemovedToast.mock.calls[0]?.[0];
    expect(artist).toBe('Artist a');

    onUndo();
    await waitFor(() => expect(toggle.mutateAsync).toHaveBeenCalledTimes(2));
    expect(toggle.mutateAsync.mock.calls[1]?.[0]).toEqual({
      eventId: 'a',
      going: true,
      restore,
    });
  });

  it('toasts without Undo when the server returned no restore', async () => {
    toggle.mutateAsync.mockResolvedValue({ going: false, restore: null });
    renderWithUpcoming();
    confirmRemoval('Artist a');

    await waitFor(() => expect(toasts.showRemovedToast).toHaveBeenCalled());
    expect(toasts.showRemovedToast.mock.calls[0]?.[0].onUndo).toBeNull();
  });

  it('raises the undo failure when the restore fails', async () => {
    toggle.mutateAsync
      .mockResolvedValueOnce({
        going: false,
        restore: { attendingAt: '2026-05-14T02:00:00.000Z', token: 't1' },
      })
      .mockRejectedValueOnce(new Error('offline'));
    renderWithUpcoming();
    confirmRemoval('Artist a');
    await waitFor(() => expect(toasts.showRemovedToast).toHaveBeenCalled());

    toasts.showRemovedToast.mock.calls[0]?.[0].onUndo();

    await waitFor(() =>
      expect(toasts.showAttendanceError).toHaveBeenCalledWith('undo'),
    );
  });
});
