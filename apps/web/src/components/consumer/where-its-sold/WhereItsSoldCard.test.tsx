// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { TierPriceBlock } from '@concert-crawl/types';
import { WhereItsSoldAnchors, WhereItsSoldCard } from './WhereItsSoldCard';
import { buildWhereItsSoldRows, type WhereItsSoldEvent } from './rows';

afterEach(() => {
  cleanup();
});

const headline = (
  submissionId: string,
  vendor: TierPriceBlock['alternates'][number]['vendor'],
  priceMin: string,
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null = 'standard',
): NonNullable<TierPriceBlock['headline']> => ({
  submissionId,
  priceMin,
  priceMax: null,
  vendor,
  sourceCategory,
  submitterHandle: 'hugh',
  observedAt: '2026-11-13T10:00:00.000Z',
  approvedAt: '2026-11-13T10:00:00.000Z',
  approvalKind: 'fan',
  confirmsCount: 2,
});

const block = (
  tier: TierPriceBlock['tier'],
  head: TierPriceBlock['headline'],
  extra: Partial<TierPriceBlock> = {},
): TierPriceBlock => ({
  tier,
  headline: head,
  alternates: [],
  pending: [],
  counterSubmission: null,
  reports: 1,
  ...extra,
});

// The board's three sellers: Ticketmaster $45 leads, AXS $47, box office $38.
const boardEvent = (
  overrides: Partial<WhereItsSoldEvent> = {},
): WhereItsSoldEvent => ({
  status: 'upcoming',
  priceStatus: 'live',
  priceSubmissionId: 'tm',
  priceByTier: [block('GA', headline('tm', 'Ticketmaster', '45.00'))],
  priceAlternates: [
    {
      id: 'axs',
      tier: 'GA',
      vendor: 'AXS',
      priceMin: '47.00',
      priceMax: null,
      sourceCategory: 'standard',
    },
    {
      id: 'vbo',
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      priceMin: '38.00',
      priceMax: null,
      sourceCategory: 'boxoffice',
    },
  ],
  counterSubmission: null,
  ...overrides,
});

const renderCard = (event: WhereItsSoldEvent) =>
  render(<WhereItsSoldCard rows={buildWhereItsSoldRows(event)} />);

describe('buildWhereItsSoldRows', () => {
  it('keeps the API trust order, primary first, never re-sorted by price', () => {
    // The $38 box office stays last: the API sent it after AXS.
    expect(buildWhereItsSoldRows(boardEvent()).map((row) => row.id)).toEqual([
      'tm',
      'axs',
      'vbo',
    ]);
  });

  it('keeps one row per seller and tier, the first the API sent', () => {
    const rows = buildWhereItsSoldRows(
      boardEvent({
        priceAlternates: [
          ...(boardEvent().priceAlternates ?? []),
          {
            // Cheaper, but sent after AXS's first GA price, so it is dropped.
            id: 'axs-later',
            tier: 'GA',
            vendor: 'AXS',
            priceMin: '40.00',
            priceMax: null,
            sourceCategory: 'standard',
          },
          {
            id: 'axs-vip',
            tier: 'VIP',
            vendor: 'AXS',
            priceMin: '120.00',
            priceMax: null,
            sourceCategory: 'standard',
          },
        ],
      }),
    );
    expect(rows.map((row) => row.id)).toEqual(['tm', 'axs', 'vbo', 'axs-vip']);
  });

  it('leaves out a price under a Price check', () => {
    const checked = buildWhereItsSoldRows(
      boardEvent({
        counterSubmission: {
          id: 'counter',
          parentSubmissionId: 'tm',
          floor: 52,
          submitter: null,
          submittedAt: '2026-11-13T10:00:00.000Z',
          lastAdminActionAt: null,
          lastAdminActionKind: null,
          pendingCount: 1,
          viewerAction: 'submit_update',
          viewerCounterId: null,
        },
      }),
    );
    expect(checked.map((row) => row.id)).toEqual(['axs', 'vbo']);
  });

  it('is empty with one seller, so the card does not show', () => {
    const oneSeller = boardEvent({ priceAlternates: [] });
    expect(buildWhereItsSoldRows(oneSeller)).toEqual([]);
    // Two tiers at one seller is still one seller.
    const sameSeller = boardEvent({
      priceAlternates: [
        {
          id: 'tm-vip',
          tier: 'VIP',
          vendor: 'Ticketmaster',
          priceMin: '120.00',
          priceMax: null,
          sourceCategory: 'standard',
        },
      ],
    });
    expect(buildWhereItsSoldRows(sameSeller)).toEqual([]);
  });

  it('leads with box office when the API sends it first (its real trust order)', () => {
    const rows = buildWhereItsSoldRows(
      boardEvent({
        priceSubmissionId: 'vbo',
        priceByTier: [
          block('GA', headline('vbo', 'VenueBoxOffice', '38.00', 'boxoffice'), {
            alternates: [
              {
                submissionId: 'tm',
                priceMin: '45.00',
                priceMax: null,
                vendor: 'Ticketmaster',
                sourceCategory: 'standard',
              },
            ],
          }),
        ],
        priceAlternates: [
          {
            id: 'tm',
            tier: 'GA',
            vendor: 'Ticketmaster',
            priceMin: '45.00',
            priceMax: null,
            sourceCategory: 'standard',
          },
          {
            id: 'axs',
            tier: 'GA',
            vendor: 'AXS',
            priceMin: '47.00',
            priceMax: null,
            sourceCategory: 'standard',
          },
        ],
      }),
    );
    expect(rows.map((row) => row.id)).toEqual(['vbo', 'tm', 'axs']);
    expect(rows[0]?.tier).toBe('GA');
  });

  it('lists only the alternates when the primary is missing from priceByTier', () => {
    // No per-tier row to read its tier and amount from, and the event row's
    // scalar price is never read, so the primary is left out.
    const rows = buildWhereItsSoldRows(
      boardEvent({ priceSubmissionId: 'gone' }),
    );
    expect(rows.map((row) => row.id)).toEqual(['axs', 'vbo']);
    expect(
      buildWhereItsSoldRows(boardEvent({ priceByTier: null })).map(
        (row) => row.id,
      ),
    ).toEqual(['axs', 'vbo']);
  });

  it('is empty for a sold-out or cancelled show, and with no prices', () => {
    expect(
      buildWhereItsSoldRows(boardEvent({ priceStatus: 'soldout' })),
    ).toEqual([]);
    expect(buildWhereItsSoldRows(boardEvent({ status: 'cancelled' }))).toEqual(
      [],
    );
    expect(
      buildWhereItsSoldRows(
        boardEvent({
          priceSubmissionId: null,
          priceByTier: null,
          priceAlternates: null,
        }),
      ),
    ).toEqual([]);
  });
});

describe('WhereItsSoldCard', () => {
  it('draws the board: eyebrow, seller, tier line and price per row', () => {
    renderCard(boardEvent());
    const card = screen.getByTestId('where-its-sold');
    expect(within(card).getByText("Where it's sold")).toBeDefined();
    const rows = within(card).getAllByTestId('where-its-sold-row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'TTicketmasterGA · all-in$45',
      'AAXSGA · all-in$47',
      'VVenue box officeGA · face value · no fees$38',
    ]);
  });

  it('names the tier on every box office row, so two box office tiers never read alike', () => {
    renderCard(
      boardEvent({
        priceSubmissionId: 'bo-ga',
        priceByTier: [
          block(
            'GA',
            headline('bo-ga', 'VenueBoxOffice', '38.00', 'boxoffice'),
          ),
          block(
            'Reserved',
            headline('bo-res', 'VenueBoxOffice', '55.00', 'boxoffice'),
          ),
        ],
        priceAlternates: [
          {
            id: 'tm',
            tier: 'GA',
            vendor: 'Ticketmaster',
            priceMin: '45.00',
            priceMax: null,
            sourceCategory: 'standard',
          },
          {
            id: 'bo-res',
            tier: 'Reserved',
            vendor: 'VenueBoxOffice',
            priceMin: '55.00',
            priceMax: null,
            sourceCategory: 'boxoffice',
          },
        ],
      }),
    );
    const lines = screen
      .getAllByTestId('where-its-sold-line')
      .map((line) => line.textContent);
    expect(lines).toContain('GA · face value · no fees');
    expect(lines).toContain('Reserved · face value · no fees');
  });

  it('draws a resale row as "{tier} · resale · all-in", the word in the Resale colour', () => {
    renderCard(
      boardEvent({
        priceAlternates: [
          {
            id: 'sh',
            tier: 'GA',
            vendor: 'StubHub',
            priceMin: '61.00',
            priceMax: null,
            sourceCategory: 'resale',
          },
        ],
      }),
    );
    const row = screen
      .getAllByTestId('where-its-sold-row')
      .find((item) => item.textContent?.includes('StubHub'));
    expect(row?.textContent).toBe('SStubHubGA · resale · all-in$61');
    const word = within(row as HTMLElement).getByTestId(
      'where-its-sold-resale',
    );
    expect(word.textContent).toBe('resale');
    expect(word.style.color).toBe('var(--trust-resale)');
    // The letter tile stays neutral.
    expect(
      within(row as HTMLElement).getByTestId('where-its-sold-tile').style
        .background,
    ).toBe('var(--surface-2)');
  });

  it('names a non-GA tier in the all-in line', () => {
    renderCard(
      boardEvent({
        priceByTier: [block('VIP', headline('tm', 'Ticketmaster', '45.00'))],
      }),
    );
    const lines = screen
      .getAllByTestId('where-its-sold-line')
      .map((line) => line.textContent);
    expect(lines).toContain('VIP · all-in');
  });

  it('scrolls each › to the price card holding the prices, never off-site', () => {
    render(
      <>
        <WhereItsSoldAnchors rows={buildWhereItsSoldRows(boardEvent())} />
        <WhereItsSoldCard rows={buildWhereItsSoldRows(boardEvent())} />
      </>,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#price-tm',
      '#price-axs',
      '#price-vbo',
    ]);
    for (const link of links) {
      const target = document.getElementById(
        (link.getAttribute('href') ?? '').slice(1),
      );
      expect(target).not.toBeNull();
    }
  });

  it('reads Other as Somewhere else and shows a range', () => {
    renderCard(
      boardEvent({
        priceAlternates: [
          {
            id: 'other',
            tier: 'GA',
            vendor: 'Other',
            priceMin: '45.00',
            priceMax: '60.00',
            sourceCategory: 'standard',
          },
        ],
      }),
    );
    const other = screen
      .getAllByTestId('where-its-sold-row')
      .find((row) => row.textContent?.includes('Somewhere else'));
    expect(other?.textContent).toBe('?Somewhere elseGA · all-in$45–$60');
  });

  describe('the › scrolls to the card for its own tier', () => {
    const realMatchMedia = window.matchMedia;
    const realScrollIntoView = Element.prototype.scrollIntoView;
    afterEach(() => {
      window.matchMedia = realMatchMedia;
      Element.prototype.scrollIntoView = realScrollIntoView;
    });
    const mockScroll = () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: false }),
      });
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      return scroll;
    };

    it('scrolls to the element marked with the row’s tier and stays on the page', () => {
      const scroll = mockScroll();
      const rows = buildWhereItsSoldRows(
        boardEvent({
          priceByTier: [
            block('GA', headline('tm', 'Ticketmaster', '45.00')),
            block('VIP', headline('vip', 'Ticketmaster', '120.00')),
          ],
          priceAlternates: [
            {
              id: 'vip-axs',
              tier: 'VIP',
              vendor: 'AXS',
              priceMin: '130.00',
              priceMax: null,
              sourceCategory: 'standard',
            },
          ],
        }),
      );
      render(
        <>
          <div data-price-tier="GA" data-testid="ga-card" />
          <div data-price-tier="VIP" data-testid="vip-row" />
          <WhereItsSoldCard rows={rows} />
        </>,
      );
      const link = document.querySelector('a[data-price-id="vip-axs"]');
      expect(link).not.toBeNull();
      const notPrevented = fireEvent.click(link as Element);
      expect(notPrevented).toBe(false);
      expect(scroll).toHaveBeenCalledTimes(1);
      expect(scroll.mock.contexts[0]).toBe(screen.getByTestId('vip-row'));
    });

    it('falls through to the row’s own anchor when no card carries the tier', () => {
      const scroll = mockScroll();
      renderCard(boardEvent());
      const link = document.querySelector('a[data-price-id="axs"]');
      const notPrevented = fireEvent.click(link as Element);
      expect(notPrevented).toBe(true);
      expect(scroll).not.toHaveBeenCalled();
    });

    it('does not animate under reduced motion', () => {
      const scroll = mockScroll();
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      render(
        <>
          <div data-price-tier="GA" />
          <WhereItsSoldCard rows={buildWhereItsSoldRows(boardEvent())} />
        </>,
      );
      fireEvent.click(
        document.querySelector('a[data-price-id="axs"]') as Element,
      );
      expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    });
  });

  it('renders nothing with no rows', () => {
    const { container } = render(<WhereItsSoldCard rows={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
