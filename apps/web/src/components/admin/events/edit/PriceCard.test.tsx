// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { EventDetail } from './event-detail';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('token') }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
const editPrice = vi.fn();
const replaceListedPrice = vi.fn();
const addPrice = vi.fn();
vi.mock('@/components/admin/prices/submitted-api', () => ({
  submittedApi: () => ({
    editPrice: (...args: unknown[]) => editPrice(...args),
    replaceListedPrice: (...args: unknown[]) => replaceListedPrice(...args),
  }),
}));
vi.mock('@/components/admin/prices/prices-api', () => ({
  pricesApi: () => ({ addPrice: (...args: unknown[]) => addPrice(...args) }),
}));
// A refusal here is any thrown value carrying an HTTP status.
const hasStatus = (err: unknown): err is { status: number } =>
  typeof err === 'object' &&
  err !== null &&
  'status' in err &&
  typeof err.status === 'number';
vi.mock('@/components/admin/invite-codes/codes-api', () => ({
  refusedStatus: (err: unknown) => (hasStatus(err) ? err.status : null),
}));
// What the sheet was told to show after each save.
const saveResults: (string | null)[] = [];
// The sheets have their own tests; here only which one opens, with what.
vi.mock('@/components/admin/prices/EditPricePanel', () => ({
  EditPricePanel: ({
    row,
    onSave,
  }: {
    row: { priceMin: string };
    onSave: (min: string, max: string | null) => Promise<string | null>;
  }) => (
    <button
      type="button"
      onClick={() =>
        void onSave('14', null).then((result) => saveResults.push(result))
      }
    >
      {`edit sheet ${row.priceMin}`}
    </button>
  ),
}));
vi.mock('@/components/admin/prices/AddPricePanel', () => ({
  AddPricePanel: ({ single }: { single?: boolean }) => (
    <div>{`add sheet${single ? ' single' : ''}`}</div>
  ),
}));

import { PriceCard } from './PriceCard';

const COPY = ADMIN_COPY.eventEdit.price;

const DETAIL: EventDetail = {
  id: 'evt-1',
  title: 'Six Foot Blonde',
  artist: 'Six Foot Blonde',
  date: '2026-11-14',
  doorsTime: null,
  showTime: '19:00:00',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  status: 'available',
  hidden: false,
  hiddenReason: null,
  watchingCount: 4,
  wentCount: null,
  isSoldOut: false,
  priceMin: '12.00',
  priceMax: null,
  submittedPriceCount: 2,
  priceRetrievedAt: '2026-11-10T18:00:00.000Z',
  ticketUrl: 'https://www.larimerlounge.com/events/1',
  mySubmission: null,
  extractionStrategy: null,
  firstSeenAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: null,
  delistedAt: null,
  venueUrl: null,
};

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  editPrice.mockReset();
  replaceListedPrice.mockReset();
  addPrice.mockReset();
  saveResults.length = 0;
});
afterEach(cleanup);

describe('PriceCard', () => {
  it('draws the listed price, the Submitted prices and the ticket page', () => {
    render(
      <PriceCard
        detail={DETAIL}
        phone={false}
        past={false}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText('$12')).toBeInTheDocument();
    expect(screen.getByText(COPY.fromValue(2))).toBeInTheDocument();
    expect(
      screen.getByText(COPY.ticketValue('larimerlounge.com', 'Nov 10')),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.submitted })).toHaveAttribute(
      'href',
      '/admin/prices?tab=submitted',
    );
  });

  it('replaces a fan’s listed price with the admin’s own (06/edit-price-desktop)', async () => {
    const onSaved = vi.fn();
    render(
      <PriceCard
        detail={DETAIL}
        phone={false}
        past={false}
        onSaved={onSaved}
      />,
    );
    replaceListedPrice.mockResolvedValue(undefined);
    const button = screen.getByTestId('event-edit-price-edit');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    // The sheet opens on the listed price.
    fireEvent.click(screen.getByText(`edit sheet ${DETAIL.priceMin ?? ''}`));
    await vi.waitFor(() =>
      expect(replaceListedPrice).toHaveBeenCalledWith(DETAIL.id, '14', null),
    );
    expect(editPrice).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('holds Edit price on the admin’s price while a Price check is open', () => {
    render(
      <PriceCard
        detail={{
          ...DETAIL,
          mySubmission: {
            id: 'sub-1',
            priceMin: '12.00',
            priceMax: null,
            status: 'disputed',
          },
        }}
        phone={false}
        past={false}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByTestId('event-edit-price-edit')).toBeDisabled();
  });

  it('opens a new price, one show only, on a show with no price', () => {
    render(
      <PriceCard
        detail={{ ...DETAIL, priceMin: null }}
        phone={false}
        past={false}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('event-edit-price-edit'));
    expect(screen.getByText('add sheet single')).toBeInTheDocument();
  });

  it('replaces the listed price on a priced show even over the admin’s own pending price', async () => {
    replaceListedPrice.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(
      <PriceCard
        detail={{
          ...DETAIL,
          mySubmission: {
            id: 'sub-1',
            priceMin: '15.00',
            priceMax: null,
            status: 'pending',
          },
        }}
        phone={false}
        past={false}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByTestId('event-edit-price-edit'));
    // The sheet opens on the listed price, not the admin's own.
    fireEvent.click(screen.getByText(`edit sheet ${DETAIL.priceMin ?? ''}`));
    await vi.waitFor(() =>
      expect(replaceListedPrice).toHaveBeenCalledWith(DETAIL.id, '14', null),
    );
    expect(editPrice).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('says a Price check is open when the replacement is refused with a 409', async () => {
    replaceListedPrice.mockRejectedValue({ status: 409 });
    const onSaved = vi.fn();
    render(
      <PriceCard
        detail={DETAIL}
        phone={false}
        past={false}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByTestId('event-edit-price-edit'));
    fireEvent.click(screen.getByText(`edit sheet ${DETAIL.priceMin ?? ''}`));
    await vi.waitFor(() => expect(saveResults).toEqual([COPY.priceCheckOpen]));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('opens and saves the admin’s own price on a show with no listed price', async () => {
    editPrice.mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(
      <PriceCard
        detail={{
          ...DETAIL,
          priceMin: null,
          mySubmission: {
            id: 'sub-1',
            priceMin: '12.00',
            priceMax: null,
            status: 'pending',
          },
        }}
        phone={false}
        past={false}
        onSaved={onSaved}
      />,
    );
    fireEvent.click(screen.getByTestId('event-edit-price-edit'));
    fireEvent.click(screen.getByText('edit sheet 12.00'));
    await vi.waitFor(() =>
      expect(editPrice).toHaveBeenCalledWith('sub-1', '14', null),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('reads a past show’s price as a record: no Edit price, no ticket page', () => {
    render(
      <PriceCard
        detail={{ ...DETAIL, priceMin: null, ticketUrl: null }}
        phone={false}
        past
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('event-edit-price-edit')).toBeNull();
    expect(screen.queryByText(ADMIN_COPY.eventEdit.price.submitted)).toBeNull();
    // Only the listed price dashes: the ticket page row is gone.
    expect(screen.getAllByText(ADMIN_COPY.eventEdit.none)).toHaveLength(1);
    expect(
      screen.getByText(ADMIN_COPY.eventEdit.past.priceRecord),
    ).toBeInTheDocument();
  });
});
