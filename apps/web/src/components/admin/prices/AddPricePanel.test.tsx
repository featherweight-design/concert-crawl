// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AddPricePanel } from './AddPricePanel';
import type { MissingRow } from './prices-api';

const COPY = ADMIN_COPY.pricesPage.add;

const ROW: MissingRow = {
  eventId: 'evt-1',
  title: 'Six Foot Blonde',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  date: '2026-11-14',
  ticketUrl: null,
  watching: 4,
};

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

describe('AddPricePanel', () => {
  it('offers Publish and next and Sold out on the Prices queue', () => {
    render(<AddPricePanel row={ROW} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: COPY.publishAndNext }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.soldOut)).toBeInTheDocument();
  });

  it('drops both for one show from Event edit (4b#19, 4b#20)', () => {
    render(
      <AddPricePanel row={ROW} onClose={vi.fn()} onSubmit={vi.fn()} single />,
    );
    expect(
      screen.queryByRole('button', { name: COPY.publishAndNext }),
    ).toBeNull();
    expect(screen.queryByLabelText(COPY.soldOut)).toBeNull();
    expect(
      screen.getByRole('button', { name: COPY.publish }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.noteSingle)).toBeInTheDocument();
    expect(screen.queryByText(COPY.note)).toBeNull();
  });
});
