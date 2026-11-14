// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
  it('orders the rows cheapest first, the primary included', () => {
    expect(buildWhereItsSoldRows(boardEvent()).map((row) => row.id)).toEqual([
      'vbo',
      'tm',
      'axs',
    ]);
  });

  it('keeps one row per seller and tier, the cheapest', () => {
    const rows = buildWhereItsSoldRows(
      boardEvent({
        priceAlternates: [
          ...(boardEvent().priceAlternates ?? []),
          {
            id: 'axs-dear',
            tier: 'GA',
            vendor: 'AXS',
            priceMin: '52.00',
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
    expect(rows.map((row) => row.id)).toEqual(['vbo', 'tm', 'axs', 'axs-vip']);
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
    expect(checked.map((row) => row.id)).toEqual(['vbo', 'axs']);
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
      'VVenue box officeface value · no fees$38',
      'TTicketmasterGA · all-in$45',
      'AAXSGA · all-in$47',
    ]);
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

  it('points each › at that price’s own card by its id, never off-site', () => {
    render(
      <>
        <WhereItsSoldAnchors rows={buildWhereItsSoldRows(boardEvent())} />
        <WhereItsSoldCard rows={buildWhereItsSoldRows(boardEvent())} />
      </>,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#price-vbo',
      '#price-tm',
      '#price-axs',
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
    expect(other?.textContent).toBe('SSomewhere elseGA · all-in$45–$60');
  });

  it('renders nothing with no rows', () => {
    const { container } = render(<WhereItsSoldCard rows={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
