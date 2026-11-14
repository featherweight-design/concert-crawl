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

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('token') }),
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
    ) => Promise<{ rows: SubmittedRow[]; total: number }>
  >();
const counts = vi.fn<(search: string) => Promise<StateCounts>>();
vi.mock('./submitted-api', () => ({
  submittedApi: () => ({
    list: (
      filter: StateFilter,
      search: string,
      offset: number,
      limit: number,
    ) => list(filter, search, offset, limit),
    counts: (search: string) => counts(search),
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
  row({ id: 'sub-1', handle: 'dlo' }),
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
      expect(list).toHaveBeenLastCalledWith('published', '', 0, 50),
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
    expect(within(items[0]!).getByTestId('fan-avatar')).toHaveTextContent('D');
    expect(within(items[1]!).getByText(COPY.noHandle)).toBeInTheDocument();
    expect(within(items[1]!).queryByTestId('fan-avatar')).toBeNull();
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

  it('filters to the fan as a chip with the count, and × clears it (4d#12)', async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    list.mockResolvedValue({ rows: [ROWS[0]!], total: 7 });
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    );
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '@dlo', 0, 50),
    );
    const chip = await screen.findByTestId('fan-filter');
    await waitFor(() =>
      expect(chip).toHaveTextContent(COPY.fanFilter('dlo', 7)),
    );
    // The typed search stays empty while the chip holds the filter.
    expect(screen.getByRole('searchbox', { name: COPY.search })).toHaveValue(
      '',
    );

    list.mockResolvedValue({ rows: ROWS, total: 2 });
    fireEvent.click(screen.getByRole('button', { name: COPY.clearFan }));
    expect(screen.queryByTestId('fan-filter')).toBeNull();
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith('all', '', 0, 50),
    );
  });

  it('typing a search replaces the fan filter', async () => {
    render(<SubmittedTab />);
    await openMenu(0);
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(COPY.menu.otherPrices.label),
      }),
    );
    await screen.findByTestId('fan-filter');
    fireEvent.change(screen.getByRole('searchbox', { name: COPY.search }), {
      target: { value: 'vince' },
    });
    expect(screen.queryByTestId('fan-filter')).toBeNull();
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
