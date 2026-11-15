// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
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
    ) => Promise<{ rows: SubmittedRow[]; total: number }>
  >();
const counts =
  vi.fn<(search: string, handle: string | null) => Promise<StateCounts>>();
const approve = vi.fn<(id: string) => Promise<void>>();
// The API's refusal, as `refusedStatus` reads it: "status 409" is a 409.
vi.mock('../invite-codes/codes-api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  refusedStatus: (err: unknown) =>
    err instanceof Error && err.message === 'status 409' ? 409 : null,
}));
vi.mock('./submitted-api', () => ({
  submittedApi: () => ({
    list: (
      filter: StateFilter,
      search: string,
      offset: number,
      limit: number,
      handle: string | null = null,
    ) => list(filter, search, offset, limit, handle),
    counts: (search: string, handle: string | null = null) =>
      counts(search, handle),
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
  ticketUrl: null,
  ...overrides,
});

const ROWS: SubmittedRow[] = [
  row({
    id: 'sub-1',
    handle: 'dlo',
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
  beforeEach(() => setPhone(true));

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
    expect(
      within(items[1]!).getByRole('button', { name: COPY.menu.label }),
    ).toBeDisabled();
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
  beforeEach(() => setPhone(false));

  const openMenu = async (index: number) => {
    const triggers = await screen.findAllByRole('button', {
      name: COPY.menu.label,
    });
    fireEvent.click(triggers[index]!);
  };

  const pickFan = () =>
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    );

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
        `${COPY.fanHandle('dlo')}${COPY.fanCount(4)}`,
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

  it("filters to the fan's exact handle, counts the fan only once counted, and × clears it (4d#12)", async () => {
    render(<SubmittedTab />);
    await openMenu(0);

    // Hold the fan's counts so the chip can be seen before they land.
    let release: (value: StateCounts) => void = () => undefined;
    counts.mockImplementation((_search, handle) =>
      handle === 'dlo'
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
    pickFan();

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'dlo'),
    );
    expect(counts).toHaveBeenLastCalledWith('', 'dlo');
    const chip = await screen.findByTestId('fan-filter');
    // No stale figure while the fan's counts are in flight.
    expect(chip).toHaveTextContent(/^@dlo$/);

    release({ all: 5, waiting: 2, published: 3, priceCheck: 0 });
    await waitFor(() =>
      expect(screen.getByTestId('fan-filter')).toHaveTextContent(
        `${COPY.fanHandle('dlo')}${COPY.fanCount(5)}`,
      ),
    );
    expect(screen.getByTestId('fan-filter')).toHaveTextContent('@dlo · 5');
    // A long handle truncates inside the chip, never past its row; the
    // count sits outside the truncating part, so it stays.
    const chipStyle = screen.getByTestId('fan-filter').style;
    expect(chipStyle.maxWidth).toBe('100%');
    expect(chipStyle.minWidth).toBe('0px');
    const handle = screen.getByTestId('fan-filter-handle');
    expect(handle.style.textOverflow).toBe('ellipsis');
    expect(handle.style.overflow).toBe('hidden');
    expect(handle).toHaveTextContent(/^@dlo$/);
    // The typed search stays empty while the chip holds the filter.
    expect(screen.getByRole('searchbox', { name: COPY.search })).toHaveValue(
      '',
    );

    list.mockResolvedValue({ rows: ROWS, total: 2 });
    fireEvent.click(screen.getByRole('button', { name: COPY.clearFan }));
    expect(screen.queryByTestId('fan-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, null),
    );
  });

  it('a typed search replaces the fan filter after the debounce, in one reload', async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    pickFan();
    await screen.findByTestId('fan-filter');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'dlo'),
    );
    const before = list.mock.calls.length;

    fireEvent.change(screen.getByRole('searchbox', { name: COPY.search }), {
      target: { value: 'vince' },
    });
    // Not before the pause in typing: no unfiltered load in between.
    expect(screen.getByTestId('fan-filter')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('fan-filter')).toBeNull());
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', 'vince', 0, 50, null),
    );
    expect(list.mock.calls.length).toBe(before + 1);
  });

  it("hides This fan's other prices on that fan's own rows", async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    pickFan();
    await screen.findByTestId('fan-filter');
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50, 'dlo'),
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
    // Then Open show, Open ticket, Edit price, Reject… (no fan: no handle).
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
    expect(triggers[1]).toBeDisabled();
    expect(triggers[0]).toBeEnabled();
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
    expect(toast).toHaveTextContent(COPY.approve.doneBody);
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
    approve.mockRejectedValueOnce(new Error('status 500'));
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
    approve.mockRejectedValueOnce(new Error('status 409'));
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

  it('widens the STATE column to 150 for Published by you', async () => {
    render(<SubmittedTab />);
    await screen.findAllByRole('listitem');
    expect(stateOf(0).style.width).toBe('150px');
  });
});
