// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { call } from '../invite-codes/codes-api';
import type { StateCounts, SubmittedRow } from './submitted-api';
import type { StateFilter } from './submitted-rules';

// A stable token getter: a new one each render rebuilds the API, so every
// render reloads and the load counts mean nothing.
const getToken = () => Promise.resolve('token');
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const list =
  vi.fn<
    (
      filter: StateFilter,
      search: string,
      offset: number,
      limit: number,
      handle: string | null,
      eventId?: string,
    ) => Promise<{ rows: SubmittedRow[]; total: number }>
  >();
const counts =
  vi.fn<
    (
      search: string,
      handle: string | null,
      eventId?: string,
    ) => Promise<StateCounts>
  >();
// The show filter's `eventId` reaches the mocks only when set, so a call
// without one reads as it did before the show filter.
const withShow = (eventId: string | null): [] | [string] =>
  eventId === null ? [] : [eventId];
const approve = vi.fn<(id: string) => Promise<void>>();

/**
 * The error a real `call` throws when the API answers `status` with `body`,
 * so the tab reads it through the real `refusedStatus` and `refusedCode`.
 */
const refusal = async (
  status: number,
  body: Record<string, unknown> = { success: false },
): Promise<unknown> => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body, { status })),
  );
  try {
    return await call(getToken, '/refused').then(
      () => new Error('not refused'),
      (err: unknown) => err,
    );
  } finally {
    vi.unstubAllGlobals();
  }
};
vi.mock('./submitted-api', () => ({
  submittedApi: () => ({
    list: (
      filter: StateFilter,
      search: string,
      offset: number,
      limit: number,
      handle: string | null = null,
      eventId: string | null = null,
    ) => list(filter, search, offset, limit, handle, ...withShow(eventId)),
    counts: (
      search: string,
      handle: string | null = null,
      eventId: string | null = null,
    ) => counts(search, handle, ...withShow(eventId)),
    editPrice: vi.fn(() => Promise.resolve()),
    approve: (id: string) => approve(id),
    reject: vi.fn(() => Promise.resolve()),
  }),
}));

import { SubmittedTab } from './SubmittedTab';

const COPY = ADMIN_COPY.pricesSubmitted;

const row = (overrides: Partial<SubmittedRow>): SubmittedRow => ({
  id: 'sub-1',
  eventId: 'evt-1',
  title: 'Vince Staples',
  venueName: 'Fillmore',
  date: '2026-11-12',
  priceMin: '50',
  priceMax: '450',
  handle: 'dlo',
  avatarColor: null,
  avatarSecondColor: null,
  backedBy: 2,
  state: 'published',
  forYou: true,
  showOthers: 0,
  ticketUrl: null,
  ...overrides,
});

const ROWS: SubmittedRow[] = [
  row({
    id: 'sub-1',
    handle: 'dlo',
    showOthers: 2,
    avatarColor: 'accent',
    avatarSecondColor: 'success',
  }),
  row({ id: 'sub-2', title: 'Marian Hill', handle: null, state: 'waiting' }),
];

const setPhone = (phone: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: phone,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  list.mockReset();
  counts.mockReset();
  approve.mockReset();
  approve.mockResolvedValue(undefined);
  list.mockResolvedValue({ rows: ROWS, total: 2 });
  counts.mockResolvedValue({
    all: 46,
    waiting: 3,
    published: 43,
    priceCheck: 0,
  });
});
afterEach(cleanup);

describe('SubmittedTab on a phone', () => {
  beforeEach(() => {
    setPhone(true);
  });

  it('puts the search on top and the filters in a segment (4d#21)', async () => {
    render(<SubmittedTab />);
    const group = await screen.findByRole('group', { name: COPY.filtersLabel });
    const search = screen.getByRole('searchbox', { name: COPY.search });
    // Search first, then the segment.
    expect(
      search.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The count reads as its own word.
    await within(group).findByRole('button', { name: 'Published 43' });
    const all = within(group).getByRole('button', { name: 'All 46' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters from the segment', async () => {
    render(<SubmittedTab />);
    const group = await screen.findByRole('group', { name: COPY.filtersLabel });
    fireEvent.click(
      await within(group).findByRole('button', { name: 'Published 43' }),
    );
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('published', '', 0, 50, null),
    );
  });

  it('reads Published on the pill, as the desktop does (4d#8)', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).getByText(COPY.states.published)).toBeVisible();
    expect(screen.queryByText('Live')).toBeNull();
  });

  // Hugh's prod report: a 1-fan price read "Waiting for you".
  it("reads Pending on a waiting price that isn't yours to decide yet", async () => {
    list.mockResolvedValue({
      rows: [
        row({ id: 'sub-9', state: 'waiting', forYou: false }),
        row({ id: 'sub-10', state: 'waiting', forYou: true }),
      ],
      total: 2,
    });
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).getByText(COPY.phoneStates.pending)).toBeVisible();
    expect(within(items[1]!).getByText(COPY.phoneStates.waiting)).toBeVisible();
  });

  it('draws an avatar beside a handle, and none for "A fan"', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).getByText('@dlo')).toBeInTheDocument();
    const face = within(items[0]!).getByTestId('person-avatar');
    expect(face).toHaveTextContent('D');
    // The fan's own pair, not the house default.
    expect(face).toHaveAttribute('data-avatar-first', 'accent');
    expect(face).toHaveAttribute('data-avatar-second', 'success');
    expect(within(items[1]!).getByText(COPY.noHandle)).toBeInTheDocument();
    expect(within(items[1]!).queryByTestId('person-avatar')).toBeNull();
  });

  it('draws Approve and ⋯ under a waiting price only (43/approve-m)', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).queryByTestId('approve-button')).toBeNull();
    expect(
      within(items[0]!).queryByRole('button', { name: COPY.menu.label }),
    ).toBeNull();
    expect(within(items[1]!).getByTestId('approve-button')).toHaveTextContent(
      COPY.menu.approve.label,
    );
    expect(
      within(items[1]!).getByRole('button', { name: COPY.menu.label }),
    ).toBeEnabled();
  });

  it('reads Approving… on the button and rests ⋯ mid-request', async () => {
    approve.mockReturnValue(new Promise(() => {}));
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    fireEvent.click(within(items[1]!).getByTestId('approve-button'));
    const button = within(items[1]!).getByTestId('approve-button');
    expect(button).toHaveTextContent(COPY.approve.approving);
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled, not disabled, so it keeps focus; a tap opens nothing.
    const more = within(items[1]!).getByRole('button', {
      name: COPY.menu.label,
    });
    expect(more).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(more);
    expect(screen.queryByRole('dialog')).toBeNull();
    // A second tap sends nothing more.
    fireEvent.click(button);
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it('approves from the button: the pill reads Published by you, with the toast', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    fireEvent.click(within(items[1]!).getByTestId('approve-button'));
    expect(approve).toHaveBeenCalledWith('sub-2');
    expect(
      await within(items[1]!).findByText(COPY.approve.publishedByYou),
    ).toBeInTheDocument();
    // A published price has no action line.
    expect(within(items[1]!).queryByTestId('approve-button')).toBeNull();
    expect(screen.getByTestId('approve-toast')).toHaveTextContent(
      COPY.approve.doneTitle('$50–$450', 'Marian Hill'),
    );
  });

  it('opens the actions sheet from ⋯, titled show · price, with the phone hints (43/approve-sheet-m)', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    fireEvent.click(
      within(items[1]!).getByRole('button', { name: COPY.menu.label }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: COPY.menu.sheetTitle('Marian Hill', '$50–$450'),
    });
    const first = within(sheet).getByTestId('price-sheet-approve');
    expect(first).toHaveTextContent(COPY.menu.approve.phoneHint('$50–$450'));
    // No backer sentence on the phone, and the shorter Edit price hint.
    expect(sheet).not.toHaveTextContent('back it');
    expect(within(sheet).getByTestId('price-sheet-edit')).toHaveTextContent(
      COPY.menu.editPrice.phoneHint,
    );
    // Approve is the first of the sheet's buttons.
    expect(within(sheet).getAllByRole('button')[0]).toBe(first);
    // Picking Approve closes the sheet and sends it.
    fireEvent.click(first);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(approve).toHaveBeenCalledWith('sub-2');
  });

  it('closes the actions sheet from the scrim, with no Cancel', async () => {
    render(<SubmittedTab />);
    const items = await screen.findAllByRole('listitem');
    fireEvent.click(
      within(items[1]!).getByRole('button', { name: COPY.menu.label }),
    );
    const sheet = await screen.findByRole('dialog');
    expect(
      within(sheet).queryByRole('button', { name: ADMIN_COPY.confirm.cancel }),
    ).toBeNull();
    fireEvent.click(screen.getByTestId('admin-sheet-scrim'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(approve).not.toHaveBeenCalled();
  });
});

describe('SubmittedTab on a desktop', () => {
  beforeEach(() => {
    setPhone(false);
  });

  const openMenu = async (index: number) => {
    const triggers = await screen.findAllByRole('button', {
      name: COPY.menu.label,
    });
    fireEvent.click(triggers[index]!);
  };

  const pickOthers = () =>
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    );

  it('offers Other prices 4th on a waiting price, counting the show’s prices, only when the show has another (43/approve-menu-d)', async () => {
    list.mockResolvedValue({
      rows: [
        row({ id: 'sub-w', state: 'waiting', showOthers: 2 }),
        row({ id: 'sub-2', title: 'Marian Hill', state: 'waiting' }),
      ],
      total: 2,
    });
    render(<SubmittedTab />);
    await openMenu(0);
    const items = screen.getAllByRole('menuitem');
    // Approve, Open show, Open ticket, Other prices, Edit price, Reject….
    expect(items[2]).toHaveTextContent(COPY.menu.openTicket.label);
    expect(items[3]).toHaveTextContent(COPY.menu.otherPrices.label);
    // The show's prices with this one, as the show chip will count them.
    expect(items[3]).toHaveTextContent(COPY.menu.otherPrices.hint(3));
    expect(items[3]).toHaveTextContent('3 for this show');
    expect(items[4]).toHaveTextContent(COPY.menu.editPrice.label);
    fireEvent.keyDown(window, { key: 'Escape' });

    // No other prices on that show: no item.
    await openMenu(1);
    expect(
      screen.queryByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    ).toBeNull();
  });

  it('opens already filtered to the fan from ?handle= (A3/12 person menu)', async () => {
    counts.mockResolvedValue({
      all: 4,
      waiting: 1,
      published: 3,
      priceCheck: 0,
    });
    list.mockResolvedValue({ rows: [ROWS[0]!], total: 4 });
    render(<SubmittedTab initialFan="dlo" />);

    await waitFor(() =>
      expect(screen.getByTestId('fan-filter')).toHaveTextContent(
        `${COPY.fanHandle('dlo')}${COPY.narrowCount(4)}`,
      ),
    );
    // The very first load is the fan's: never the unfiltered list first.
    expect(list.mock.calls[0]).toEqual(['all', '', 0, 50, 'dlo']);
    expect(counts.mock.calls[0]).toEqual(['', 'dlo']);
  });

  it('follows ?handle= while mounted: another fan swaps the chip, none clears it', async () => {
    counts.mockResolvedValue({
      all: 4,
      waiting: 1,
      published: 3,
      priceCheck: 0,
    });
    list.mockResolvedValue({ rows: [ROWS[0]!], total: 4 });
    const { rerender } = render(<SubmittedTab initialFan={null} />);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null),
    );
    expect(screen.queryByTestId('fan-filter')).toBeNull();

    rerender(<SubmittedTab initialFan="dlo" />);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'dlo'),
    );
    expect(await screen.findByTestId('fan-filter')).toHaveTextContent(/^@dlo/);

    rerender(<SubmittedTab initialFan="sam" />);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'sam'),
    );

    rerender(<SubmittedTab initialFan={null} />);
    await waitFor(() => expect(screen.queryByTestId('fan-filter')).toBeNull());
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null),
    );
  });

  it("filters to the show's prices, counts the show only once counted, and × clears it (43)", async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    // The hint promises the figure the chip shows: the show's prices under All.
    expect(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    ).toHaveTextContent(COPY.menu.otherPrices.hint(3));

    // Hold the show's counts so the chip can be seen before they land.
    let release: (value: StateCounts) => void = () => undefined;
    counts.mockImplementation((_search, _handle, eventId) =>
      eventId === 'evt-1'
        ? new Promise<StateCounts>((resolve) => {
            release = resolve;
          })
        : Promise.resolve({
            all: 46,
            waiting: 3,
            published: 43,
            priceCheck: 0,
          }),
    );
    // The list total (narrowed by the state chip) is not the chip's figure.
    list.mockResolvedValue({ rows: [ROWS[0]!], total: 7 });
    pickOthers();

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null, 'evt-1'),
    );
    expect(counts).toHaveBeenLastCalledWith('', null, 'evt-1');
    const chip = await screen.findByTestId('show-filter');
    // No stale figure while the show's counts are in flight.
    expect(chip).toHaveTextContent(/^Vince Staples$/);

    // This row and its two others: the hint's 3.
    release({ all: 3, waiting: 1, published: 2, priceCheck: 0 });
    await waitFor(() =>
      expect(screen.getByTestId('show-filter')).toHaveTextContent(
        `Vince Staples${COPY.narrowCount(3)}`,
      ),
    );
    // A long title truncates inside the chip, never past its row; the count
    // sits outside the truncating part, so it stays.
    const chipStyle = screen.getByTestId('show-filter').style;
    expect(chipStyle.maxWidth).toBe('100%');
    expect(chipStyle.minWidth).toBe('0px');
    const title = screen.getByTestId('show-filter-title');
    expect(title.style.textOverflow).toBe('ellipsis');
    expect(title.style.overflow).toBe('hidden');
    expect(title).toHaveTextContent(/^Vince Staples$/);
    // The typed search stays empty while the chip holds the filter.
    expect(screen.getByRole('searchbox', { name: COPY.search })).toHaveValue(
      '',
    );

    list.mockResolvedValue({ rows: ROWS, total: 2 });
    fireEvent.click(screen.getByRole('button', { name: COPY.clearShow }));
    expect(screen.queryByTestId('show-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null),
    );
  });

  it('clears the fan filter from its ×', async () => {
    render(<SubmittedTab initialFan="dlo" />);
    await screen.findByTestId('fan-filter');
    fireEvent.click(screen.getByRole('button', { name: COPY.clearFan }));
    expect(screen.queryByTestId('fan-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null),
    );
  });

  it('a typed search replaces the show filter after the debounce, in one reload', async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    pickOthers();
    await screen.findByTestId('show-filter');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null, 'evt-1'),
    );
    const before = list.mock.calls.length;

    fireEvent.change(screen.getByRole('searchbox', { name: COPY.search }), {
      target: { value: 'vince' },
    });
    // Not before the pause in typing: no unfiltered load in between.
    expect(screen.getByTestId('show-filter')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('show-filter')).toBeNull());
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', 'vince', 0, 50, null),
    );
    expect(list.mock.calls.length).toBe(before + 1);
  });

  it('a typed search replaces the fan filter after the debounce, in one reload', async () => {
    render(<SubmittedTab initialFan="dlo" />);
    await screen.findByTestId('fan-filter');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'dlo'),
    );
    const before = list.mock.calls.length;

    fireEvent.change(screen.getByRole('searchbox', { name: COPY.search }), {
      target: { value: 'vince' },
    });
    expect(screen.getByTestId('fan-filter')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('fan-filter')).toBeNull());
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', 'vince', 0, 50, null),
    );
    expect(list.mock.calls.length).toBe(before + 1);
  });

  it('keeps the fan and show filters exclusive: picking one clears the other', async () => {
    const { rerender } = render(<SubmittedTab initialFan="dlo" />);
    await screen.findByTestId('fan-filter');
    await openMenu(0);
    pickOthers();
    expect(await screen.findByTestId('show-filter')).toBeInTheDocument();
    expect(screen.queryByTestId('fan-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null, 'evt-1'),
    );

    // A ?handle= link while the show is filtered swaps to the fan.
    rerender(<SubmittedTab initialFan="sam" />);
    expect(await screen.findByTestId('fan-filter')).toHaveTextContent(/^@sam/);
    expect(screen.queryByTestId('show-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'sam'),
    );
  });

  it("hides Other prices on that show's own rows", async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    pickOthers();
    await screen.findByTestId('show-filter');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null, 'evt-1'),
    );
    await openMenu(0);
    expect(
      screen.queryByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    ).toBeNull();
    // Another item proves the menu is open.
    expect(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.openShow.label),
      }),
    ).toBeInTheDocument();
  });

  it('opens Edit price as the Event edit sheet, with Cancel', async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.editPrice.label),
      }),
    );
    expect(
      await screen.findByRole('button', { name: ADMIN_COPY.confirm.cancel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.edit.save }),
    ).toBeInTheDocument();
  });

  const pickApprove = () =>
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(`^${COPY.menu.approve.label}`),
      }),
    );
  const stateOf = (index: number) =>
    within(screen.getAllByRole('listitem')[index]!).getByTestId(
      'submitted-state',
    );

  it('puts Approve first, with the price and its backers, on a waiting price only (43/approve-menu-d)', async () => {
    render(<SubmittedTab />);
    await openMenu(1);
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent(COPY.menu.approve.label);
    expect(items[0]).toHaveTextContent(COPY.menu.approve.hint('$50–$450', 2));
    // Then Open show, Open ticket, Edit price, Reject… (no other prices on
    // the show: no Other prices).
    expect(items).toHaveLength(5);
    expect(items[1]).toHaveTextContent(COPY.menu.openShow.label);
    expect(items[1]).toHaveTextContent('Marian Hill · Fillmore');
    expect(items[items.length - 1]).toHaveTextContent(COPY.menu.reject.label);
    fireEvent.keyDown(window, { key: 'Escape' });

    await openMenu(0);
    expect(
      screen.queryByRole('menuitem', {
        name: new RegExp(`^${COPY.menu.approve.label}`),
      }),
    ).toBeNull();
    expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent(
      COPY.menu.openShow.label,
    );
  });

  it('marks the row Approving… mid-request, rests its ⋯, and leaves the list undimmed (43/approve-busy-d)', async () => {
    approve.mockReturnValue(new Promise(() => {}));
    render(<SubmittedTab />);
    await openMenu(1);
    pickApprove();
    expect(stateOf(1)).toHaveTextContent(COPY.approve.approving);
    const triggers = screen.getAllByRole('button', { name: COPY.menu.label });
    expect(triggers[1]).toHaveAttribute('aria-disabled', 'true');
    expect(triggers[0]).not.toHaveAttribute('aria-disabled');
    const row = screen.getAllByRole('listitem')[1]!;
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(row.style.background).toBe('var(--surface-2)');
    // No list-wide busy dimming for Approve.
    const list = screen.getByRole('list', { name: COPY.listLabel });
    expect(list.parentElement?.parentElement).toHaveAttribute(
      'aria-busy',
      'false',
    );
  });

  it('approves in place: Published by you, counts moved without a refetch, a toast with no Undo (43/approve-done-d)', async () => {
    render(<SubmittedTab />);
    const group = await screen.findByRole('group', {
      name: COPY.filtersLabel,
    });
    await within(group).findByRole('button', { name: 'Waiting for you 3' });
    const loads = list.mock.calls.length;
    const countLoads = counts.mock.calls.length;
    await openMenu(1);
    pickApprove();
    await waitFor(() =>
      expect(stateOf(1)).toHaveTextContent(COPY.approve.publishedByYou),
    );
    expect(approve).toHaveBeenCalledWith('sub-2');
    expect(
      within(group).getByRole('button', { name: 'Waiting for you 2' }),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole('button', { name: 'Published 44' }),
    ).toBeInTheDocument();
    expect(list.mock.calls.length).toBe(loads);
    expect(counts.mock.calls.length).toBe(countLoads);
    const toast = screen.getByTestId('approve-toast');
    expect(toast).toHaveTextContent(
      COPY.approve.doneTitle('$50–$450', 'Marian Hill'),
    );
    expect(within(toast).queryByRole('button')).toBeNull();
    // Now published: no Approve in its menu.
    await openMenu(1);
    expect(
      screen.queryByRole('menuitem', {
        name: new RegExp(`^${COPY.menu.approve.label}`),
      }),
    ).toBeNull();
  });

  it("says Didn't approve on a failure, and Try again sends it again (43/approve-failed-d)", async () => {
    approve.mockRejectedValueOnce(await refusal(500));
    render(<SubmittedTab />);
    await openMenu(1);
    pickApprove();
    await waitFor(() =>
      expect(stateOf(1)).toHaveTextContent(COPY.approve.didntApprove),
    );
    const toast = screen.getByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.approve.failedTitle);
    expect(toast).toHaveTextContent(COPY.approve.failedBody);
    fireEvent.click(
      within(toast).getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() =>
      expect(stateOf(1)).toHaveTextContent(COPY.approve.publishedByYou),
    );
    expect(approve).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('reloads the list when the price is no longer waiting (409), with no Try again', async () => {
    approve.mockRejectedValueOnce(
      await refusal(409, { success: false, code: 'not_waiting' }),
    );
    render(<SubmittedTab />);
    await openMenu(1);
    const loads = list.mock.calls.length;
    pickApprove();
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.approve.failedTitle);
    expect(toast).toHaveTextContent(COPY.approve.notWaitingBody);
    expect(within(toast).queryByRole('button')).toBeNull();
    await waitFor(() => expect(list.mock.calls.length).toBe(loads + 1));
    expect(stateOf(1)).not.toHaveTextContent(COPY.approve.didntApprove);
  });

  it('says the price waits in its Price check on a 409 price_check', async () => {
    approve.mockRejectedValueOnce(
      await refusal(409, { success: false, code: 'price_check' }),
    );
    render(<SubmittedTab />);
    await openMenu(1);
    const loads = list.mock.calls.length;
    pickApprove();
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.approve.priceCheckBody);
    expect(toast).not.toHaveTextContent(COPY.approve.notWaitingBody);
    expect(within(toast).queryByRole('button')).toBeNull();
    await waitFor(() => expect(list.mock.calls.length).toBe(loads + 1));
  });

  it('reads a 404 as no longer waiting, and reloads', async () => {
    approve.mockRejectedValueOnce(
      await refusal(404, { success: false, error: 'Submission not found' }),
    );
    render(<SubmittedTab />);
    await openMenu(1);
    const loads = list.mock.calls.length;
    pickApprove();
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.approve.notWaitingBody);
    expect(within(toast).queryByRole('button')).toBeNull();
    await waitFor(() => expect(list.mock.calls.length).toBe(loads + 1));
  });

  it('reloads after a 5xx, which may have published it, and keeps Try again on a still-waiting row', async () => {
    approve.mockRejectedValueOnce(await refusal(503));
    render(<SubmittedTab />);
    await openMenu(1);
    const loads = list.mock.calls.length;
    pickApprove();
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.approve.failedBody);
    await waitFor(() => expect(list.mock.calls.length).toBe(loads + 1));
    expect(stateOf(1)).toHaveTextContent(COPY.approve.didntApprove);
    expect(
      within(toast).getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    ).toBeInTheDocument();
  });

  it('drops the toast when the filter changed mid-approve, and loads the new list again', async () => {
    let settle: () => void = () => {};
    approve.mockReturnValueOnce(
      new Promise<void>((done) => {
        settle = done;
      }),
    );
    render(<SubmittedTab />);
    const group = await screen.findByRole('group', {
      name: COPY.filtersLabel,
    });
    await openMenu(1);
    pickApprove();
    fireEvent.click(
      await within(group).findByRole('button', { name: 'Published 43' }),
    );
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('published', '', 0, 50, null),
    );
    const loads = list.mock.calls.length;
    await act(async () => {
      settle();
      await Promise.resolve();
    });
    // The load during the request may predate it: the new list loads again.
    await waitFor(() => expect(list.mock.calls.length).toBe(loads + 1));
    expect(list).toHaveBeenLastCalledWith('published', '', 0, 50, null);
    expect(screen.queryByTestId('approve-toast')).toBeNull();
  });

  it('keeps focus on the ⋯ after Approve is picked, resting it with aria-disabled', async () => {
    approve.mockReturnValue(new Promise(() => {}));
    render(<SubmittedTab />);
    await openMenu(1);
    pickApprove();
    const trigger = screen.getAllByRole('button', { name: COPY.menu.label })[1];
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).not.toBeDisabled();
    expect(document.activeElement).toBe(trigger);
  });

  it('widens the STATE column to 150 for Published by you', async () => {
    render(<SubmittedTab />);
    await screen.findAllByRole('listitem');
    expect(stateOf(0).style.width).toBe('150px');
  });
});
