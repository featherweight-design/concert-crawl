// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PriceDisplay } from '@/components/consumer/PriceDisplay';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { stubMatchMedia } from '@/test-utils/match-media';
import { TIP_CONTENT } from '@/components/ui/cc-tip';

describe('PriceDisplay price provenance tip', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('offers the who-set-this-price tip alongside the price label', () => {
    render(
      <PriceDisplay
        priceMin="35.00"
        priceMax={null}
        priceSource="community"
        venueName="Larimer Lounge"
        ticketUrl="https://example.com/tickets"
        eventId="evt_1"
        artist="Test Artist"
        date="2026-09-01T02:00:00.000Z"
      />,
    );

    expect(
      screen.queryByRole('button', {
        name: TIP_CONTENT['who-set-this-price'].label,
      }),
    ).not.toBeNull();
  });
});

describe('PriceDisplay live community card (more-p-price_states)', () => {
  const priceCopy = CONSUMER_COPY.priceDisplay;
  const base = {
    priceMin: '44.00',
    priceMax: '60.00',
    priceSource: 'community' as const,
    venueName: 'Larimer Lounge',
    ticketUrl: null,
    eventId: 'evt_1',
    artist: 'Test Artist',
    date: '2026-09-01T02:00:00.000Z',
  };

  beforeEach(() => {
    stubMatchMedia(false);
  });
  afterEach(cleanup);

  it('puts the COMMUNITY badge in the top row, not after the price', () => {
    render(<PriceDisplay {...base} />);

    const badge = screen.getByTestId('price-community-badge');
    expect(badge.textContent).toBe(priceCopy.communityLabel);
    expect(badge.style.textTransform).toBe('uppercase');
    // Same row as the TICKETS eyebrow.
    expect(
      badge.parentElement?.textContent?.includes(priceCopy.ticketsLabel),
    ).toBe(true);
    expect(screen.getAllByText(priceCopy.communityLabel)).toHaveLength(1);
  });

  it('sets the headline qualifier in mono caps', () => {
    render(<PriceDisplay {...base} />);

    const qualifier = screen.getByText(priceCopy.startingAllIn);
    expect(qualifier.style.textTransform).toBe('uppercase');
    expect(qualifier.style.letterSpacing).toBe('0.1em');
  });

  it('attributes the submitter and the fans who confirmed', () => {
    render(
      <PriceDisplay
        {...base}
        priceSubmitterHandle="hugh"
        priceConfirmsCount={2}
      />,
    );

    expect(screen.getByTestId('price-community-attribution').textContent).toBe(
      `${priceCopy.submittedByPrefix} @hugh · 2 ${priceCopy.fansConfirmedSuffix}`,
    );
  });

  it('names an anonymous submitter in the same line, upright', () => {
    render(<PriceDisplay {...base} />);

    const line = screen.getByTestId('price-community-attribution');
    expect(line.textContent).toBe(
      `${priceCopy.submittedByPrefix} ${priceCopy.anonymousFan}`,
    );
    expect(line.querySelector('em')).toBeNull();
    expect(line.style.fontStyle).toBe('');
  });

  it('draws no footer rule when the footer has nothing to show', () => {
    render(<PriceDisplay {...base} />);

    expect(screen.queryByTestId('price-card-footer')).toBeNull();
  });

  it('keeps the footer for a source name on a non-community price', () => {
    render(<PriceDisplay {...base} priceSource="ticketmaster" />);

    expect(screen.getByTestId('price-card-footer')).toBeTruthy();
    expect(screen.queryByTestId('price-community-badge')).toBeNull();
  });
});
