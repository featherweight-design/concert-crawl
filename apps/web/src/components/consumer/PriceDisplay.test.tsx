// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The price-age line mounts StillAccurateAction, which reads the router and
// the Clerk session. Signed out, it renders nothing.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn(async () => null),
    isLoaded: true,
    isSignedIn: false,
  }),
}));

import { PriceDisplay } from '@/components/consumer/PriceDisplay';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { stubMatchMedia } from '@/test-utils/match-media';
import { TIP_CONTENT } from '@/components/ui/cc-tip';

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

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

describe('PriceDisplay live community card (price-states-age-trust)', () => {
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

  it('puts the shared Community TrustPill on the TICKETS line, not after the price', () => {
    render(<PriceDisplay {...base} />);

    const pill = screen.getByTestId('trust-pill-community');
    expect(pill.textContent).toBe('Community');
    expect(pill.style.height).toBe('19px');
    expect(pill.style.fontSize).toBe('9.5px');
    expect(pill.style.letterSpacing).toBe('0.08em');
    expect(pill.style.borderRadius).toBe('6px');
    // Same row as the TICKETS eyebrow, and the only trust mark on the card.
    expect(
      pill.parentElement?.textContent?.includes(priceCopy.ticketsLabel),
    ).toBe(true);
    expect(screen.getAllByTestId(/^trust-pill-/)).toHaveLength(1);
  });

  it('sets the headline qualifier in 10px mono caps at 0.1em', () => {
    render(<PriceDisplay {...base} />);

    const qualifier = screen.getByText(priceCopy.startingAllIn);
    expect(qualifier.style.textTransform).toBe('uppercase');
    expect(qualifier.style.letterSpacing).toBe('0.1em');
    expect(qualifier.style.fontSize).toBe('10px');
  });

  it('draws a 34px/900 headline under a 9.5px eyebrow', () => {
    render(<PriceDisplay {...base} />);

    const headline = screen.getByText('$44–$60');
    expect(headline.style.fontSize).toBe('34px');
    expect(headline.style.fontWeight).toBe('900');
    expect(headline.style.letterSpacing).toBe('-0.035em');
    const eyebrow = screen.getByText(priceCopy.ticketsLabel);
    expect(eyebrow.style.fontSize).toBe('9.5px');
    expect(eyebrow.style.letterSpacing).toBe('0.14em');
  });

  it('attributes the submitter and the fans who confirmed in 13px', () => {
    render(
      <PriceDisplay
        {...base}
        priceSubmitterHandle="hugh"
        priceConfirmsCount={2}
      />,
    );

    const line = screen.getByTestId('price-submitter-attribution');
    expect(line.textContent).toBe('Submitted by @hugh · 2 fans confirmed');
    expect(line.style.fontSize).toBe('13px');
  });

  it('names an anonymous submitter in the same line, upright', () => {
    render(<PriceDisplay {...base} />);

    const line = screen.getByTestId('price-submitter-attribution');
    expect(line.textContent).toBe('Submitted by an anonymous fan');
    expect(line.querySelector('em, i')).toBeNull();
    expect(line.querySelector('[style*="italic"]')).toBeNull();
  });

  it('draws no footer rule when the footer has nothing to show', () => {
    render(<PriceDisplay {...base} />);

    expect(screen.queryByTestId('price-card-footer')).toBeNull();
  });

  it('keeps the footer for a source name on a primary price', () => {
    render(<PriceDisplay {...base} priceSource="ticketmaster" />);

    expect(screen.getByTestId('price-card-footer')).toBeTruthy();
    expect(screen.queryByTestId(/^trust-pill-/)).toBeNull();
  });
});

describe('PriceDisplay price age (addendum 4 item 5)', () => {
  const base = {
    priceMin: '44.00',
    priceMax: '60.00',
    priceSource: 'community' as const,
    venueName: 'Larimer Lounge',
    ticketUrl: null,
    eventId: 'evt_1',
    artist: 'Test Artist',
    date: '2026-09-01T02:00:00.000Z',
    priceSubmitterHandle: 'hugh',
    priceConfirmsCount: 2,
  };

  beforeEach(() => {
    stubMatchMedia(false);
  });
  afterEach(cleanup);

  it('puts the age on its own line straight under "Submitted by"', () => {
    render(<PriceDisplay {...base} priceObservedAt={daysAgo(3)} />);

    const attribution = screen.getByTestId('price-submitter-attribution');
    const ageLine = screen.getByTestId('price-age-line');
    // The attribution's wrapper is followed directly by the age line.
    expect(attribution.parentElement?.nextElementSibling).toBe(ageLine);
    // Spelled out: the line is set in caps, where "3D AGO" misreads.
    expect(ageLine.textContent).toBe('as of 3 days ago');
    expect(ageLine.style.marginTop).toBe('6px');
    // The age left the footer: nothing else to show, so no footer at all.
    expect(screen.queryByTestId('price-card-footer')).toBeNull();
  });

  it('sets the age in plain 9px mono caps at 0.06em', () => {
    render(<PriceDisplay {...base} priceObservedAt={daysAgo(3)} />);

    const age = screen.getByTestId('price-age');
    expect(age.style.fontSize).toBe('9px');
    expect(age.style.letterSpacing).toBe('0.06em');
    expect(age.style.textTransform).toBe('uppercase');
  });

  it('keeps an old price plain: no "could be stale", no amber dot', () => {
    render(<PriceDisplay {...base} priceObservedAt={daysAgo(9)} />);

    const ageLine = screen.getByTestId('price-age-line');
    expect(ageLine.textContent).toBe('as of 9 days ago');
    expect(screen.queryByText(/could be stale/)).toBeNull();
    expect(ageLine.querySelector('svg')).toBeNull();
  });

  it('draws no age line when the observation time is unknown', () => {
    render(<PriceDisplay {...base} />);

    expect(screen.queryByTestId('price-age-line')).toBeNull();
  });
});

describe('PriceDisplay live box office card (price-states-age-trust)', () => {
  const priceCopy = CONSUMER_COPY.priceDisplay;
  const boxOffice = {
    priceMin: '38.00',
    priceMax: null,
    priceSource: 'community' as const,
    priceVendor: 'VenueBoxOffice',
    priceSourceCategory: 'boxoffice' as const,
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

  it('puts the Box office TrustPill top right, beside the eyebrow', () => {
    render(<PriceDisplay {...boxOffice} />);

    const pill = screen.getByTestId('trust-pill-boxoffice');
    expect(pill.textContent).toBe('Box office');
    // The star leads the label.
    expect(pill.querySelector('svg')).not.toBeNull();
    expect(
      pill.parentElement?.textContent?.includes(priceCopy.boxOfficeLabel),
    ).toBe(true);
    expect(screen.getAllByTestId(/^trust-pill-/)).toHaveLength(1);
  });

  it('sets "face value · no fees" in 10px mono caps at 0.1em', () => {
    render(<PriceDisplay {...boxOffice} />);

    const qualifier = screen.getByText(priceCopy.faceValueNoFees);
    expect(qualifier.style.textTransform).toBe('uppercase');
    expect(qualifier.style.letterSpacing).toBe('0.1em');
    expect(qualifier.style.fontSize).toBe('10px');
  });

  it('attributes the submitter and the fans who confirmed, as community does', () => {
    render(
      <PriceDisplay
        {...boxOffice}
        priceSubmitterHandle="hugh"
        priceConfirmsCount={2}
      />,
    );

    expect(screen.getByTestId('price-submitter-attribution').textContent).toBe(
      'Submitted by @hugh · 2 fans confirmed',
    );
  });

  it('draws the $38 at 34px, the community price scale', () => {
    render(<PriceDisplay {...boxOffice} />);

    expect(screen.getByText('$38').style.fontSize).toBe('34px');
  });

  it('puts the age under the attribution', () => {
    render(
      <PriceDisplay
        {...boxOffice}
        priceSubmitterHandle="hugh"
        priceObservedAt={new Date(
          Date.now() - 2 * 60 * 60 * 1000,
        ).toISOString()}
      />,
    );

    expect(screen.getByTestId('price-age-line').textContent).toBe(
      'as of 2 hours ago',
    );
  });
});
