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

import { PriceBatchPanel } from './PriceBatchPanel';

const submission = (id: string, title: string): SubmittedRow => ({
  id,
  eventId: `e-${id}`,
  title,
  venueName: 'Bluebird Theater',
  date: '2026-02-22',
  priceMin: '44',
  priceMax: null,
  handle: 'fan',
  backedBy: 2,
  state: 'waiting',
  ticketUrl: null,
});

const ROWS = [
  submission('a', 'Marian Hill'),
  submission('b', 'Ninth Key'),
  submission('c', 'FKJ'),
];

beforeEach(() => {
  mockList.mockReset();
  mockList.mockResolvedValue({ rows: ROWS, total: ROWS.length });
});
afterEach(cleanup);

const mount = (onApprove = vi.fn(async () => undefined), onClose = vi.fn()) => {
  render(
    <PriceBatchPanel
      row={{ key: 'batch', submissionIds: ['a', 'b', 'c'] }}
      onApprove={onApprove}
      onClose={onClose}
    />,
  );
  return { onApprove, onClose };
};

describe('PriceBatchPanel', () => {
  it('docks beside the queue with the board’s title, line and footnote', async () => {
    mount();
    expect(await screen.findByText('Marian Hill')).toBeInTheDocument();
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();
    expect(screen.getByText('3 new prices')).toBeInTheDocument();
    expect(
      screen.getByText(/Shows in the next 30 days\. Each matches/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approving publishes them and thanks the fans in Submitted prices. It counts as one decision.',
      ),
    ).toBeInTheDocument();
  });

  it('counts the ticks in Approve and sends exactly the ticked ids', async () => {
    const { onApprove } = mount();
    await screen.findByText('Marian Hill');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Approve FKJ' }));
    const approve = screen.getByRole('button', { name: 'Approve 2' });
    fireEvent.click(approve);
    await waitFor(() => expect(onApprove).toHaveBeenCalledWith(['a', 'b']));
  });

  it('turns Approve off at zero ticks and cancels without approving', async () => {
    const { onApprove, onClose } = mount();
    await screen.findByText('Marian Hill');
    for (const name of ['Marian Hill', 'Ninth Key', 'FKJ'])
      fireEvent.click(
        screen.getByRole('checkbox', { name: `Approve ${name}` }),
      );
    expect(screen.getByRole('button', { name: 'Approve 0' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('keeps the panel open and says nothing changed when approving is refused', async () => {
    const onApprove = vi.fn(async () => {
      throw new Error('refused');
    });
    mount(onApprove);
    await screen.findByText('Marian Hill');
    fireEvent.click(screen.getByRole('button', { name: 'Approve 3' }));
    expect(
      await screen.findByText('Couldn’t approve. Nothing changed.'),
    ).toBeInTheDocument();
  });
});
