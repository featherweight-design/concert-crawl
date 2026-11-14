// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { SubmittedRow } from '@/components/admin/prices/submitted-api';

const { mockList } = vi.hoisted(() => ({
  mockList:
    vi.fn<
      (
        filter: string,
        search: string,
        offset: number,
        limit: number,
      ) => Promise<{ rows: SubmittedRow[]; total: number }>
    >(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/components/admin/prices/submitted-api', () => ({
  submittedApi: () => ({ list: mockList }),
}));

import { PriceBatchSheet } from './PriceBatchSheet';

const submission = (
  id: string,
  title: string,
  patch: Partial<SubmittedRow> = {},
): SubmittedRow => ({
  id,
  eventId: `e-${id}`,
  title,
  venueName: 'Bluebird Theater',
  date: '2026-02-22',
  priceMin: '44',
  priceMax: null,
  handle: 'fan',
  avatarColor: null,
  avatarSecondColor: null,
  backedBy: 2,
  state: 'waiting',
  ticketUrl: null,
  ...patch,
});

const ROWS = [
  submission('a', 'Marian Hill'),
  submission('b', 'Ninth Key', {
    venueName: 'Gothic Theatre',
    date: '2026-11-11',
    priceMin: '35',
    priceMax: '65',
  }),
  submission('c', 'FKJ', { venueName: 'Mission Ballroom', priceMin: '68' }),
];

const mount = (
  ids: string[],
  onApprove = vi.fn(async () => undefined),
  onClose = vi.fn(),
) =>
  render(
    <PriceBatchSheet
      row={{ key: 'batch', submissionIds: ids }}
      onApprove={onApprove}
      onClose={onClose}
    />,
  );

beforeEach(() => {
  mockList.mockReset();
  // The pending list also holds submissions that are not in this batch.
  mockList.mockResolvedValue({
    rows: [...ROWS, submission('z', 'Not in the batch')],
    total: 4,
  });
});
afterEach(cleanup);

describe('<PriceBatchSheet />', () => {
  it('lists only the batch, all ticked, with the board’s lines', async () => {
    mount(['a', 'b', 'c']);
    expect(await screen.findByText('Marian Hill')).toBeInTheDocument();
    expect(screen.queryByText('Not in the batch')).toBeNull();
    expect(screen.getByText('3 new prices')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Each one matches a second fan’s submission. Untick any you want to look at first.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bluebird Theater · Sun Feb 22'),
    ).toBeInTheDocument();
    expect(screen.getByText('$35–$65')).toBeInTheDocument();
    expect(screen.getAllByText('2 fans')).toHaveLength(3);
    expect(
      screen
        .getAllByRole('checkbox')
        .every((box) => (box as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Approve 3' })).toBeEnabled();
  });

  it('sends exactly the ticked ids, and the count follows the ticks', async () => {
    const onApprove = vi.fn(async () => undefined);
    mount(['a', 'b', 'c'], onApprove);
    await screen.findByText('Marian Hill');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Approve Ninth Key' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(onApprove).toHaveBeenCalledWith(['a', 'c']);
  });

  it('cannot approve with nothing ticked', async () => {
    mount(['a']);
    await screen.findByText('Marian Hill');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Approve Marian Hill' }),
    );
    expect(screen.getByRole('button', { name: 'Approve 0' })).toBeDisabled();
  });

  it('counts ids that are no longer waiting and never sends them', async () => {
    const onApprove = vi.fn(async () => undefined);
    mount(['a', 'gone-1', 'gone-2'], onApprove);
    await screen.findByText('Marian Hill');
    expect(
      screen.getByText('2 prices are no longer waiting.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve 1' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledWith(['a']));
  });

  it('says so when none of the batch is waiting', async () => {
    mount(['gone']);
    expect(
      await screen.findByText('None of these prices is waiting any more.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve 0' })).toBeDisabled();
  });

  it('offers Try again when the list will not load', async () => {
    mockList.mockRejectedValueOnce(new Error('down'));
    mount(['a']);
    expect(
      await screen.findByText('Couldn’t load the prices.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Marian Hill')).toBeInTheDocument();
  });

  it('stays open and says nothing changed when the approve is refused', async () => {
    const onApprove = vi.fn(async () => {
      throw new Error('422');
    });
    const onClose = vi.fn();
    mount(['a'], onApprove, onClose);
    await screen.findByText('Marian Hill');
    fireEvent.click(screen.getByRole('button', { name: 'Approve 1' }));
    expect(
      await screen.findByText('Couldn’t approve. Nothing changed.'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Approve 1' })).toBeEnabled();
  });

  it('opens with focus at rest, not on Cancel, and keeps each meta line to one line', async () => {
    mount(['a']);
    await screen.findByText('Marian Hill');
    await waitFor(() =>
      expect(screen.getByTestId('price-batch-sheet')).toHaveFocus(),
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveFocus();
    const meta = screen.getByText('Bluebird Theater · Sun Feb 22');
    expect(meta.style.whiteSpace).toBe('nowrap');
    expect(meta.style.textOverflow).toBe('ellipsis');
  });

  it('closes on Cancel', async () => {
    const onClose = vi.fn();
    mount(
      ['a'],
      vi.fn(async () => undefined),
      onClose,
    );
    await screen.findByText('Marian Hill');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('stops paging when the server gives no rows or no usable total', async () => {
    mockList.mockReset();
    mockList.mockResolvedValue({ rows: [], total: Number.NaN });
    mount(['a']);
    expect(
      await screen.findByText('None of these prices is waiting any more.'),
    ).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the parent rebuilds an identical id list', async () => {
    const onApprove = vi.fn(async () => undefined);
    const view = render(
      <PriceBatchSheet
        row={{ key: 'batch', submissionIds: ['a', 'b'] }}
        onApprove={onApprove}
        onClose={vi.fn()}
      />,
    );
    await screen.findByText('Marian Hill');
    const calls = mockList.mock.calls.length;
    view.rerender(
      <PriceBatchSheet
        row={{ key: 'batch', submissionIds: ['a', 'b'] }}
        onApprove={onApprove}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText('Marian Hill')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(calls);
  });

  it('shows the latest batch, not a slower answer for the old one', async () => {
    mockList.mockReset();
    let release: (rows: SubmittedRow[]) => void = () => undefined;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = (rows) => resolve({ rows, total: rows.length });
        }),
    );
    mockList.mockResolvedValue({ rows: ROWS, total: 3 });
    const view = render(
      <PriceBatchSheet
        row={{ key: 'old', submissionIds: ['a'] }}
        onApprove={vi.fn(async () => undefined)}
        onClose={vi.fn()}
      />,
    );
    view.rerender(
      <PriceBatchSheet
        row={{ key: 'new', submissionIds: ['b'] }}
        onApprove={vi.fn(async () => undefined)}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText('Ninth Key')).toBeInTheDocument();
    release([submission('a', 'Marian Hill')]);
    await new Promise((done) => setTimeout(done, 0));
    expect(screen.queryByText('Marian Hill')).toBeNull();
    expect(screen.getByText('Ninth Key')).toBeInTheDocument();
  });

  it('walks the pending list past one page until it has the whole batch', async () => {
    const page = (which: number) =>
      Array.from({ length: 100 }, (_, index) =>
        submission(`p${which}-${index}`, `Filler ${which}-${index}`),
      );
    mockList
      .mockResolvedValueOnce({ rows: page(1), total: 250 })
      .mockResolvedValueOnce({
        rows: [...page(2).slice(0, 99), submission('late', 'Late Act')],
        total: 250,
      });
    mount(['late']);
    expect(await screen.findByText('Late Act')).toBeInTheDocument();
    expect(mockList).toHaveBeenNthCalledWith(1, 'waiting', '', 0, 100);
    expect(mockList).toHaveBeenNthCalledWith(2, 'waiting', '', 100, 100);
  });
});
