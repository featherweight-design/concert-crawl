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
import type { OpenCheck, ResolvedCheck } from './checks-api';

const COPY = ADMIN_COPY.pricesChecks;

const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

const OPEN: OpenCheck = {
  contestId: 'c-1',
  eventId: 'e-1',
  title: 'Vince Staples',
  venueName: 'Fillmore',
  date: '2026-11-12',
  ticketUrl: 'https://tickets.example/vince',
  watching: 44,
  listed: {
    id: 's-1',
    priceMin: '50.00',
    priceMax: '450.00',
    handle: 'dlo',
    observedAt: '2026-11-01T18:00:00.000Z',
  },
  check: {
    id: 's-2',
    priceMin: '180.00',
    priceMax: null,
    handle: 'theo.wav',
    observedAt: '2026-11-10T18:00:00.000Z',
  },
};

const RESOLVED: ResolvedCheck = {
  id: 'r-1',
  title: 'Ninth Key',
  venueName: 'Gothic Theatre',
  date: '2026-11-20',
  answer: 'used',
  price: '45.00',
  decidedBy: 'hugh',
  decidedAt: '2026-11-11T16:40:00.000Z',
};

const open = vi.fn(async () => ({ items: [OPEN], total: 1 }));
const resolved = vi.fn(async () => ({ items: [RESOLVED], total: 17 }));
vi.mock('./checks-api', () => ({
  checksApi: () => ({ open, resolved, resolve: vi.fn() }),
}));

import { PriceChecksTab } from './PriceChecksTab';

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

describe('PriceChecksTab on desktop', () => {
  it('stacks Ticket page, Use and Keep in one column', async () => {
    render(<PriceChecksTab />);
    const card = (await screen.findByText('Vince Staples')).closest('li');
    expect(card).not.toBeNull();
    const ticket = within(card as HTMLElement).getByRole('link', {
      name: COPY.ticketPage,
    });
    // Stacked: the answers sit in a column under the ticket page.
    const column = ticket.parentElement as HTMLElement;
    expect(column.style.flexDirection).toBe('column');
    expect(ticket.style.height).toBe('32px');
  });
});

describe('PriceChecksTab on the phone', () => {
  it('heads each card PRICE CHECK with show · date, and gives the ticket page its own row', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    const card = (await screen.findByText(/Vince Staples ·/)).closest('li');
    const scope = within(card as HTMLElement);
    expect(scope.getAllByText(COPY.priceCheck).length).toBeGreaterThan(1);
    expect(
      scope.getByRole('link', {
        name: ADMIN_COPY.pricesPage.add.openTicketPage,
      }),
    ).toHaveStyle({
      height: '40px',
    });
  });

  it('has an Open / Resolved segment that shows the resolved list', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    const tabs = await screen.findByTestId('price-checks-views');
    // Named with a space before the count, not "Resolved17".
    const tab = within(tabs).getByRole('tab', {
      name: `${COPY.views.resolved} 17`,
    });
    fireEvent.click(tab);
    expect(await screen.findByText('Ninth Key')).toBeInTheDocument();
    expect(screen.queryByText(/Vince Staples/)).toBeNull();
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      tab.id,
    );
  });

  it('wraps a long deciding handle inside its column', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    const tabs = await screen.findByTestId('price-checks-views');
    fireEvent.click(
      within(tabs).getByRole('tab', { name: `${COPY.views.resolved} 17` }),
    );
    const decided = await screen.findByTestId('resolved-decided-by');
    expect(decided.style.minWidth).toBe('0px');
    expect(decided.style.overflowWrap).toBe('anywhere');
  });

  it('puts Use before Keep, as ruled (A3 4d #20)', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    const card = (await screen.findByText(/Vince Staples ·/)).closest('li');
    const buttons = within(card as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.textContent ?? '');
    expect(buttons.findIndex((text) => text.startsWith('Use'))).toBeLessThan(
      buttons.findIndex((text) => text.startsWith('Keep')),
    );
  });
});
