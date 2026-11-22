// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MultiSourceMultiTierCard } from './MultiSourceMultiTierCard';

afterEach(() => {
  cleanup();
});

describe('MultiSourceMultiTierCard (state #5 — live multi-tier mixed sources)', () => {
  const baseProps = {
    headlineTier: 'GA',
    headlinePrice: 20,
    headlineVendor: 'Venue',
    crossSource: {
      source: 'Ticketmaster',
      kind: 'resale' as const,
      price: 35,
    },
  };

  it('renders headline with "from $20 GA", box-office trust pill, and meta line', () => {
    render(
      <MultiSourceMultiTierCard
        {...baseProps}
        otherTiers={[
          {
            tier: 'VIP',
            floor: 80,
            vendor: 'Venue',
            kind: 'boxoffice',
          },
        ]}
      />,
    );

    // Eyebrow
    expect(screen.getByText('Tickets')).toBeDefined();
    // Headline parts
    expect(screen.getByText('from')).toBeDefined();
    expect(screen.getByText('$20')).toBeDefined();
    expect(screen.getByText('GA')).toBeDefined();
    // Meta template — populated with the headline vendor
    expect(
      screen.getByText('seen on Venue · face value · no fees'),
    ).toBeDefined();
  });

  it('renders "Or pay for convenience" eyebrow + cross-source resale row', () => {
    render(<MultiSourceMultiTierCard {...baseProps} otherTiers={[]} />);

    expect(screen.getByText('Or pay for convenience')).toBeDefined();
    // AltSourceRow contents
    expect(screen.getByText('Ticketmaster')).toBeDefined();
    expect(screen.getByText('resale')).toBeDefined();
    expect(screen.getByText('$35')).toBeDefined();
  });

  it('renders "Other tiers" section with one VIP boxoffice row when provided', () => {
    render(
      <MultiSourceMultiTierCard
        {...baseProps}
        otherTiers={[
          {
            tier: 'VIP',
            floor: 80,
            vendor: 'Venue',
            kind: 'boxoffice',
          },
        ]}
      />,
    );

    expect(screen.getByText('Other tiers')).toBeDefined();
    expect(screen.getByText('VIP')).toBeDefined();
    expect(screen.getByText('Venue')).toBeDefined();
    expect(screen.getByText('$80')).toBeDefined();
  });

  it('omits the "Other tiers" section when otherTiers is empty', () => {
    render(<MultiSourceMultiTierCard {...baseProps} otherTiers={[]} />);

    expect(screen.queryByText('Other tiers')).toBeNull();
  });
  describe('price check outcome lines (cold review item 12)', () => {
    const held = {
      submissionId: 'sub-1',
      outcome: 'held' as const,
      resolvedAt: '2026-11-20T00:00:00.000Z',
      previous: null,
    };

    it('draws the line under the headline price only when the headline was checked', () => {
      render(
        <MultiSourceMultiTierCard
          {...baseProps}
          headlineOutcome={held}
          otherTiers={[]}
        />,
      );
      expect(screen.getAllByTestId('price-check-outcome')).toHaveLength(1);
      const line = screen.getByTestId('price-check-outcome');
      const alternate = screen.getByText('Or pay for convenience');
      const meta = screen.getByText('seen on Venue · face value · no fees');
      // Between the headline's meta line and the alternate block: under the
      // big price, not under the alternate.
      expect(
        meta.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        line.compareDocumentPosition(alternate) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('draws the line inside the alternate block when the alternate was checked', () => {
      render(
        <MultiSourceMultiTierCard
          {...baseProps}
          crossSource={{ ...baseProps.crossSource, outcome: held }}
          otherTiers={[]}
        />,
      );
      const line = screen.getByTestId('price-check-outcome');
      const alternate = screen.getByText('Or pay for convenience');
      const altPrice = screen.getByText('$35');
      // Under the alternate's own row.
      expect(
        alternate.compareDocumentPosition(line) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        altPrice.compareDocumentPosition(line) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('draws one line per checked price and none when neither was checked', () => {
      const { rerender } = render(
        <MultiSourceMultiTierCard
          {...baseProps}
          headlineOutcome={held}
          crossSource={{ ...baseProps.crossSource, outcome: held }}
          otherTiers={[]}
        />,
      );
      expect(screen.getAllByTestId('price-check-outcome')).toHaveLength(2);
      rerender(<MultiSourceMultiTierCard {...baseProps} otherTiers={[]} />);
      expect(screen.queryByTestId('price-check-outcome')).toBeNull();
    });
  });
});
