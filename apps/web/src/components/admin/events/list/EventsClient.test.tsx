// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { EventListPage } from './events-api';

const COPY = ADMIN_COPY.eventsList;
const RED_ROCKS = '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6';
const BLUEBIRD = '7f6e5d4c-3b2a-4190-8f7e-6d5c4b3a2910';

const mockReplace = vi.fn();
let mockSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

// A stable token getter: a new one each render would rebuild the API and
// reload forever.
const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

const page: EventListPage = {
  rows: [],
  total: 1204,
  counts: {
    all: 1204,
    noPrice: 214,
    hidden: 4,
    byStatus: { available: 903, soldout: 142, postponed: 6, cancelled: 9 },
    byVenue: [
      { venueId: BLUEBIRD, name: 'Bluebird Theater', slug: 'bb', total: 63 },
      { venueId: RED_ROCKS, name: 'Red Rocks', slug: 'rr', total: 88 },
    ],
  },
};
const list = vi.fn(async () => page);
vi.mock('./events-api', () => ({ eventsListApi: () => ({ list }) }));

import { EventsClient } from './EventsClient';

beforeEach(() => {
  mockSearch = '';
  mockReplace.mockClear();
  // `useIsPhone` reads matchMedia, which jsdom does not ship.
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

const lastHref = () => mockReplace.mock.calls.at(-1)?.[0];

describe('EventsClient filters', () => {
  it('toggles No price and Hidden through the URL', async () => {
    render(<EventsClient />);
    const noPrice = await screen.findByRole('button', { name: /No price/ });
    expect(noPrice).toHaveTextContent('214');
    expect(noPrice).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(noPrice);
    expect(lastHref()).toBe('/admin/events?noPrice=1');
    cleanup();

    mockSearch = 'noPrice=1&hidden=1';
    render(<EventsClient />);
    const hidden = await screen.findByRole('button', { name: /Hidden/ });
    expect(hidden).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(hidden);
    expect(lastHref()).toBe('/admin/events?noPrice=1');
  });

  it('ticks statuses and applies them with Show N', async () => {
    render(<EventsClient />);
    fireEvent.click(await screen.findByTestId('status-filter-chip'));
    const popover = screen.getByTestId('status-filter');
    // Moved waits for Hugh (4b#1).
    expect(within(popover).queryByText('Moved')).toBeNull();
    expect(
      within(popover).getByRole('button', { name: 'Show 1,204' }),
    ).toBeInTheDocument();
    fireEvent.click(within(popover).getByLabelText(/Postponed/));
    fireEvent.click(within(popover).getByLabelText(/Cancelled/));
    fireEvent.click(within(popover).getByRole('button', { name: 'Show 15' }));
    expect(lastHref()).toBe('/admin/events?statuses=postponed%2Ccancelled');
    expect(screen.queryByTestId('status-filter')).toBeNull();
  });

  it('keeps a ticked venue listed at 0 when the search drops it', async () => {
    mockSearch = `venueIds=${RED_ROCKS}`;
    const { rerender } = render(<EventsClient />);
    await screen.findByTestId('venue-filter-chip');
    list.mockResolvedValueOnce({
      ...page,
      counts: { ...page.counts, all: 63, byVenue: [page.counts.byVenue[0]!] },
    });
    mockSearch = `venueIds=${RED_ROCKS}&q=blue`;
    rerender(<EventsClient />);
    await screen.findByText(COPY.subtitle(63));
    fireEvent.click(screen.getByTestId('venue-filter-chip'));
    const box = within(screen.getByTestId('venue-filter')).getByLabelText(
      /Red Rocks/,
    );
    expect(box).toBeChecked();
    expect(box.closest('label')).toHaveTextContent(/0$/);
  });

  it('lists venues by count with a working search, and Clear unticks', async () => {
    mockSearch = `venueIds=${RED_ROCKS}`;
    render(<EventsClient />);
    const chip = await screen.findByTestId('venue-filter-chip');
    // The chosen label is held for Design: the chip keeps "Any venue".
    expect(chip).toHaveTextContent(COPY.anyVenue);
    fireEvent.click(chip);
    const popover = screen.getByTestId('venue-filter');
    // Sorted by count, most first, whatever order the API sent.
    const text = popover.textContent ?? '';
    expect(text.indexOf('Red Rocks')).toBeLessThan(
      text.indexOf('Bluebird Theater'),
    );
    expect(within(popover).getByText('63')).toBeInTheDocument();
    expect(within(popover).getByLabelText(/Red Rocks/)).toBeChecked();
    expect(
      within(popover).getByRole('button', { name: 'Show 88' }),
    ).toBeInTheDocument();

    fireEvent.change(within(popover).getByLabelText(COPY.findVenue), {
      target: { value: 'blue' },
    });
    expect(within(popover).getAllByRole('checkbox')).toHaveLength(1);

    fireEvent.click(within(popover).getByRole('button', { name: COPY.clear }));
    fireEvent.click(
      within(popover).getByRole('button', { name: 'Show 1,204' }),
    );
    expect(lastHref()).toBe('/admin/events');
  });

  it('draws no venue, status, No price or Hidden chips on Past', async () => {
    mockSearch = 'when=past';
    render(<EventsClient />);
    expect(
      await screen.findByRole('button', { name: COPY.when.past }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('venue-filter-chip')).toBeNull();
    expect(screen.queryByTestId('status-filter-chip')).toBeNull();
    expect(screen.queryByRole('button', { name: /No price/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Hidden/ })).toBeNull();
  });
});
