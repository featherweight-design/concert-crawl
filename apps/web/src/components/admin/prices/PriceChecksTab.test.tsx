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
  eventId: 'e-9',
  title: 'Ninth Key',
  venueName: 'Gothic Theatre',
  date: '2026-11-12',
  ticketUrl: 'https://tickets.example/ninth',
  answer: 'used',
  price: '45.00',
  decidedBy: 'hugh',
  decidedByAvatar: { color: 'warning', secondColor: 'success' },
  decidedAt: '2026-11-11T16:40:00.000Z',
  note: 'Ticketmaster page shows $45 GA with fees.',
  parent: {
    priceMin: '65.00',
    priceMax: '495.00',
    handle: 'kmusic',
    confirmed: 2,
    note: null,
  },
  challenger: {
    priceMin: '45.00',
    priceMax: null,
    handle: 'theo.wav',
    confirmed: 1,
    note: 'fees in',
  },
  told: ['parent', 'challenger'],
  snapshot: true,
};

const open = vi.fn(async () => ({ items: [OPEN], total: 1 }));
const resolved = vi.fn(
  async (
    _offset: number,
    _limit: number,
  ): Promise<{ items: ResolvedCheck[]; total: number }> => ({
    items: [RESOLVED],
    total: 17,
  }),
);
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

  it('keeps the Resolved table, its deciding handle wrapping in its column', async () => {
    render(<PriceChecksTab />);
    const chips = await screen.findByTestId('price-checks-views');
    fireEvent.click(
      within(chips).getByRole('button', { name: `${COPY.views.resolved} 17` }),
    );
    const decided = await screen.findByTestId('resolved-decided-by');
    expect(decided.style.minWidth).toBe('0px');
    expect(decided.style.overflowWrap).toBe('anywhere');
    expect(resolved).toHaveBeenLastCalledWith(0, 50);
    // Desktop rows open nothing.
    expect(
      within(
        screen.getByRole('list', { name: COPY.resolvedLabel }),
      ).queryByRole('button'),
    ).toBeNull();
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

  it('has Open / Resolved chips that switch views', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    const chips = await screen.findByTestId('price-checks-views');
    // Named with a space before the count, not "Resolved17".
    const resolvedChip = within(chips).getByRole('button', {
      name: `${COPY.views.resolved} 17`,
    });
    expect(within(chips).queryByRole('tab')).toBeNull();
    fireEvent.click(resolvedChip);
    expect(resolvedChip).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Ninth Key')).toBeInTheDocument();
    expect(screen.queryByText(/Vince Staples/)).toBeNull();
    fireEvent.click(
      within(chips).getByRole('button', { name: `${COPY.views.open} 1` }),
    );
    expect(await screen.findByText(/Vince Staples ·/)).toBeInTheDocument();
  });

  it('asks for five resolved checks at a time', async () => {
    setPhone(true);
    render(<PriceChecksTab />);
    await screen.findByTestId('price-checks-views');
    expect(resolved).toHaveBeenLastCalledWith(0, 5);
  });
});

const openResolved = async () => {
  setPhone(true);
  render(<PriceChecksTab />);
  const chips = await screen.findByTestId('price-checks-views');
  // Any count: some tests answer with a one-row fixture (`total: 1`).
  fireEvent.click(
    within(chips).getByRole('button', {
      name: new RegExp(`^${COPY.views.resolved} \\d+$`),
    }),
  );
  return screen.findByRole('list', { name: COPY.resolvedLabel });
};

const SHEET = COPY.resolved.sheet;

describe('PriceChecksTab › Resolved on the phone', () => {
  afterEach(() => {
    resolved.mockClear();
    resolved.mockImplementation(async () => ({ items: [RESOLVED], total: 17 }));
  });

  it('draws title, venue · date, @handle · decided day and the answer', async () => {
    const list = await openResolved();
    const row = within(list).getByRole('button');
    expect(within(row).getByText('Ninth Key')).toBeInTheDocument();
    expect(
      within(row).getByText('Gothic Theatre · Nov 12'),
    ).toBeInTheDocument();
    expect(within(row).getByText('@hugh · Nov 11')).toBeInTheDocument();
    expect(within(row).getByTestId('person-avatar')).toHaveAttribute(
      'data-avatar-first',
      'warning',
    );
    expect(within(row).getByTestId('resolved-answer')).toHaveTextContent(
      'Used $45+',
    );
  });

  it('opens a read-only sheet with both prices, Decided, Told, Note and the links', async () => {
    const list = await openResolved();
    fireEvent.click(within(list).getByRole('button'));
    const sheet = screen.getByRole('dialog', { name: 'Ninth Key' });
    const scope = within(sheet);
    expect(scope.getByText('Gothic Theatre · Thu Nov 12')).toBeInTheDocument();
    const other = scope.getByTestId('resolved-side-other');
    expect(within(other).getByText(SHEET.wasListed)).toBeInTheDocument();
    expect(within(other).getByText('$65–$495')).toHaveStyle({
      textDecoration: 'line-through',
    });
    expect(
      within(other).getByText('@kmusic · 2 confirmed'),
    ).toBeInTheDocument();
    const chosen = scope.getByTestId('resolved-side-chosen');
    expect(within(chosen).getByText(SHEET.used)).toBeInTheDocument();
    expect(within(chosen).getByText('$45+')).toBeInTheDocument();
    expect(
      within(chosen).getByText('@theo.wav · “fees in”'),
    ).toBeInTheDocument();
    expect(scope.getByText(SHEET.decided)).toBeInTheDocument();
    expect(scope.getByText(/^@hugh · Nov 11, \d/)).toBeInTheDocument();
    expect(scope.getByText(SHEET.toldBoth)).toBeInTheDocument();
    expect(scope.getByText(RESOLVED.note ?? '')).toBeInTheDocument();
    expect(scope.getByRole('link', { name: SHEET.openShow })).toHaveAttribute(
      'href',
      '/admin/events/e-9/edit',
    );
    expect(
      scope.getByRole('link', {
        name: ADMIN_COPY.pricesPage.add.openTicketPage,
      }),
    ).toHaveAttribute('href', 'https://tickets.example/ninth');
    expect(scope.getByText(SHEET.readOnly)).toBeInTheDocument();
    expect(scope.queryByRole('button', { name: /^(Use|Keep)/ })).toBeNull();
    fireEvent.click(
      scope.getByRole('button', { name: ADMIN_COPY.panel.close }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('outlines the kept listing and strikes the fan’s price on Kept', async () => {
    resolved.mockImplementation(async () => ({
      items: [{ ...RESOLVED, answer: 'kept', price: '65.00' }],
      total: 1,
    }));
    const list = await openResolved();
    fireEvent.click(within(list).getByRole('button'));
    const sheet = screen.getByRole('dialog');
    const chosen = within(sheet).getByTestId('resolved-side-chosen');
    expect(within(chosen).getByText(SHEET.kept)).toBeInTheDocument();
    expect(within(chosen).getByText('$65–$495')).toBeInTheDocument();
    const other = within(sheet).getByTestId('resolved-side-other');
    expect(within(other).getByText(COPY.priceCheck)).toBeInTheDocument();
    expect(within(other).getByText('$45+')).toHaveStyle({
      textDecoration: 'line-through',
    });
  });

  it('omits Told when unknown, and the links it has nothing for', async () => {
    resolved.mockImplementation(async () => ({
      items: [{ ...RESOLVED, told: null, ticketUrl: null, eventId: null }],
      total: 1,
    }));
    const list = await openResolved();
    fireEvent.click(within(list).getByRole('button'));
    const scope = within(screen.getByRole('dialog'));
    expect(scope.queryByText(SHEET.told)).toBeNull();
    expect(scope.queryByRole('link', { name: SHEET.openShow })).toBeNull();
    expect(
      scope.queryByRole('link', {
        name: ADMIN_COPY.pricesPage.add.openTicketPage,
      }),
    ).toBeNull();
    expect(scope.getByText(SHEET.readOnly)).toBeInTheDocument();
  });

  it('says who was told when only one side was', async () => {
    resolved.mockImplementation(async () => ({
      items: [{ ...RESOLVED, told: ['challenger'] }],
      total: 1,
    }));
    const list = await openResolved();
    fireEvent.click(within(list).getByRole('button'));
    expect(
      within(screen.getByRole('dialog')).getByText(SHEET.toldOne('@theo.wav')),
    ).toBeInTheDocument();
  });

  it('loads the next five from where the list ends', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      ...RESOLVED,
      id: `r-${i}`,
    }));
    resolved.mockImplementation(async (offset: number) => ({
      items: offset === 0 ? five : [{ ...RESOLVED, id: 'r-next' }],
      total: 17,
    }));
    await openResolved();
    expect(screen.getByText(COPY.resolved.showing(5, 17))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.resolved.loadMore }),
    );
    expect(
      await screen.findByText(COPY.resolved.showing(6, 17)),
    ).toBeInTheDocument();
    expect(resolved).toHaveBeenLastCalledWith(5, 5);
  });

  it('keeps the pages Load more added when a decision refreshes the list', async () => {
    const all = Array.from({ length: 17 }, (_, i) => ({
      ...RESOLVED,
      id: `r-${i}`,
    }));
    resolved.mockImplementation(async (offset: number, limit: number) => ({
      items: all.slice(offset, offset + limit),
      total: 17,
    }));
    await openResolved();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.resolved.loadMore }),
    );
    expect(
      await screen.findByText(COPY.resolved.showing(10, 17)),
    ).toBeInTheDocument();
    const chips = screen.getByTestId('price-checks-views');
    fireEvent.click(
      within(chips).getByRole('button', { name: `${COPY.views.open} 1` }),
    );
    const card = (await screen.findByText(/Vince Staples ·/)).closest('li');
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', { name: /^Use/ }),
    );
    await waitFor(() => expect(resolved).toHaveBeenLastCalledWith(0, 10));
    fireEvent.click(
      within(chips).getByRole('button', {
        name: new RegExp(`^${COPY.views.resolved}`),
      }),
    );
    expect(
      await screen.findByText(COPY.resolved.showing(10, 17)),
    ).toBeInTheDocument();
  });

  it('hides Open show when the event is gone, though the entry kept its id', async () => {
    resolved.mockImplementation(async () => ({
      items: [{ ...RESOLVED, title: null }],
      total: 1,
    }));
    const list = await openResolved();
    // Row and sheet agree on the fallback title.
    expect(within(list).getByText(COPY.priceCheck)).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button'));
    const scope = within(screen.getByRole('dialog', { name: COPY.priceCheck }));
    expect(scope.queryByRole('link', { name: SHEET.openShow })).toBeNull();
    expect(
      scope.getByRole('link', {
        name: ADMIN_COPY.pricesPage.add.openTicketPage,
      }),
    ).toBeInTheDocument();
  });
});
