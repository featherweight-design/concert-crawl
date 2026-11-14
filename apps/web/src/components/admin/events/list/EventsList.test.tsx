// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { EventListRow } from './events-api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { EventsList } from './EventsList';

const COPY = ADMIN_COPY.eventsList;

const row = (overrides: Partial<EventListRow>): EventListRow => ({
  id: 'evt-1',
  title: 'Clipse & J.I.D',
  date: '2026-11-12',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  status: 'available',
  hidden: false,
  hiddenReason: null,
  priceMin: '65.00',
  priceMax: '495.00',
  watchingCount: 31,
  wentCount: null,
  ...overrides,
});

// `useIsPhone` reads matchMedia, which jsdom does not ship.
const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => setPhone(false));
afterEach(cleanup);

describe('EventsList on desktop', () => {
  it('keeps a hidden show’s status chip and adds the Hidden chip (4b#8)', () => {
    render(
      <EventsList
        when="upcoming"
        rows={[
          row({
            id: 'evt-2',
            title: 'Michael Smoak',
            status: 'soldout',
            hidden: true,
            hiddenReason: 'unsure',
            watchingCount: 7,
          }),
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: COPY.title });
    const [, dataRow] = within(table).getAllByRole('row');
    expect(dataRow).toBeDefined();
    const cells = within(dataRow as HTMLElement);
    expect(cells.getByText(COPY.status.soldout)).toBeInTheDocument();
    expect(cells.getByText(COPY.hiddenReason.unsure)).toBeInTheDocument();
    // Watching reads "—" on a hidden row.
    expect(cells.queryByText('7')).not.toBeInTheDocument();
    expect(cells.getByText(COPY.none)).toBeInTheDocument();
  });

  it('names an admin-hidden show’s reason', () => {
    render(
      <EventsList
        when="upcoming"
        rows={[row({ hidden: true, hiddenReason: 'admin' })]}
      />,
    );
    expect(screen.getByText(COPY.status.available)).toBeInTheDocument();
    expect(screen.getByText(COPY.hiddenReason.admin)).toBeInTheDocument();
  });

  it('draws price, Watching and the ⋯ on an upcoming row', () => {
    render(<EventsList when="upcoming" rows={[row({})]} />);
    expect(screen.getByText('$65–$495')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.queryByText(COPY.hiddenReason.unsure)).toBeNull();
    expect(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    ).toBeInTheDocument();
  });

  it('draws Played, CONCERTS "went" and no ⋯ on Past', () => {
    render(
      <EventsList
        when="past"
        rows={[
          row({
            title: 'Japanese Breakfast',
            status: 'played',
            priceMin: '45.00',
            priceMax: null,
            wentCount: 14,
          }),
          row({
            id: 'evt-3',
            title: 'Turnstile',
            status: 'cancelled',
            priceMin: null,
            priceMax: null,
            wentCount: 0,
          }),
        ]}
      />,
    );
    expect(
      screen.getByRole('columnheader', { name: COPY.columns.concerts }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.status.played)).toBeInTheDocument();
    expect(screen.getByText(COPY.went(14))).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('EventsList on the phone', () => {
  it('draws cards with both chips on a hidden show and no Watching line', () => {
    setPhone(true);
    render(
      <EventsList
        when="upcoming"
        rows={[
          row({ hidden: true, hiddenReason: 'unsure', status: 'postponed' }),
          row({ id: 'evt-4', title: 'Cashmere', priceMin: null }),
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: COPY.title });
    const [hiddenCard, plainCard] = within(list).getAllByRole('listitem');
    const hidden = within(hiddenCard as HTMLElement);
    expect(hidden.getByText(COPY.status.postponed)).toBeInTheDocument();
    expect(hidden.getByText(COPY.hiddenReason.unsure)).toBeInTheDocument();
    expect(hidden.queryByText(COPY.watching(31))).toBeNull();
    const plain = within(plainCard as HTMLElement);
    expect(plain.getByText(COPY.phoneNoPrice)).toBeInTheDocument();
    expect(plain.getByText(COPY.watching(31))).toBeInTheDocument();
    expect(plain.getByRole('link')).toHaveAttribute(
      'href',
      '/admin/events/evt-4/edit',
    );
  });
});
