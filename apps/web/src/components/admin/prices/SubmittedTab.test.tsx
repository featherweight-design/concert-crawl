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
        COPY.fanFilter('dlo', 4),
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
        COPY.fanFilter('dlo', 5),
      ),
    );
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
});
