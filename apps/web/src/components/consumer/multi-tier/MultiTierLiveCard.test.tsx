// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PriceCheckOutcome } from '@concert-crawl/types';
import { MultiTierLiveCard } from './MultiTierLiveCard';

afterEach(() => {
  cleanup();
});

describe('MultiTierLiveCard', () => {
  it('renders boxoffice headline with PendingTrustPill kind=boxoffice (gold pill)', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 25,
          tier: 'GA',
          vendor: 'Bluebird',
          kind: 'boxoffice',
        }}
        alternates={[]}
      />,
    );
    expect(screen.getByText('$25')).toBeDefined();
    expect(screen.getByText('GA')).toBeDefined();
    // PendingTrustPill renders "Box office" when kind=boxoffice
    expect(screen.getByText('Box office')).toBeDefined();
    expect(screen.getByText('seen on Bluebird')).toBeDefined();
  });

  it('renders community headline with PendingTrustPill kind=community', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 30,
          tier: 'GA',
          vendor: 'AXS',
          kind: 'community',
        }}
        alternates={[]}
      />,
    );
    expect(screen.getByText('Community')).toBeDefined();
  });

  it('renders resale headline with PendingTrustPill kind=resale (coral pill)', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 110,
          tier: 'GA',
          vendor: 'StubHub',
          kind: 'resale',
        }}
        alternates={[]}
      />,
    );
    // The shared B+ TrustPill (addendum 4 item 5) in its resale kind.
    const pill = screen.getByTestId('trust-pill-resale');
    expect(pill.textContent).toBe('Resale');
  });

  it('appends "· N reports" to the meta line when reports > 1 (§8 state #19)', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 30,
          tier: 'GA',
          vendor: 'AXS',
          kind: 'community',
        }}
        alternates={[]}
        reports={3}
      />,
    );
    // Single text node: "seen on AXS · 3 reports"
    expect(screen.getByText('seen on AXS · 3 reports')).toBeDefined();
  });

  it('suppresses the reports caption when reports === 1 (single observation)', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 30,
          tier: 'GA',
          vendor: 'AXS',
          kind: 'community',
        }}
        alternates={[]}
        reports={1}
      />,
    );
    expect(screen.getByText('seen on AXS')).toBeDefined();
    expect(screen.queryByText(/reports/)).toBeNull();
  });

  it('suppresses the reports caption when reports is undefined', () => {
    render(
      <MultiTierLiveCard
        headline={{
          floor: 30,
          tier: 'GA',
          vendor: 'AXS',
          kind: 'community',
        }}
        alternates={[]}
      />,
    );
    expect(screen.getByText('seen on AXS')).toBeDefined();
    expect(screen.queryByText(/reports/)).toBeNull();
  });

  it('renders alternates including kind=resale (coral dot)', () => {
    const { container } = render(
      <MultiTierLiveCard
        headline={{
          floor: 25,
          tier: 'GA',
          vendor: 'Bluebird',
          kind: 'boxoffice',
        }}
        alternates={[
          {
            tier: 'VIP',
            vendor: 'StubHub',
            floor: 150,
            kind: 'resale',
          },
        ]}
      />,
    );
    // Alternate row vendor + price visible
    expect(screen.getByText('StubHub')).toBeDefined();
    expect(screen.getByText('$150')).toBeDefined();
    // Look for the coral dot in the alternate row.
    const dots = Array.from(
      container.querySelectorAll('div[style*="border-radius: 2.5px"]'),
    );
    const coral = dots.find((dot) =>
      (dot as HTMLElement).style.background.includes('var(--danger)'),
    );
    expect(coral).toBeDefined();
  });
});

// #1366 — this card was the only price surface with no staleness tell, so an
// old price read as current on the event page while Watching flagged it.
describe('MultiTierLiveCard staleness marker', () => {
  const renderAt = (observedAt: string | null) =>
    render(
      <MultiTierLiveCard
        headline={{ floor: 68, tier: 'GA', vendor: 'AXS', kind: 'community' }}
        alternates={[]}
        observedAt={observedAt}
      />,
    );

  // Addendum 4 item 5: the stale tone is gone (Hugh, 2026-11-10). An old
  // price states its age as plainly as a fresh one.
  it('states an old price plainly, with no stale warning', () => {
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    ).toISOString();
    renderAt(eightDaysAgo);
    expect(screen.getByText('as of 8d ago')).toBeDefined();
    expect(screen.queryByText(/could be stale/)).toBeNull();
  });

  it('states the age without the warning when the price is fresh', () => {
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    renderAt(anHourAgo);
    expect(screen.getByText('as of 1h ago')).toBeDefined();
  });

  it('renders no stamp when the observation time is unknown', () => {
    renderAt(null);
    expect(screen.queryByText(/as of/)).toBeNull();
  });
});

// How the last price check ended (more-st-disputes_board, "After review").
describe('MultiTierLiveCard price check outcome', () => {
  const renderWith = (checkOutcome: PriceCheckOutcome | null) =>
    render(
      <MultiTierLiveCard
        headline={{ floor: 44, tier: 'GA', vendor: 'AXS', kind: 'community' }}
        alternates={[]}
        checkOutcome={checkOutcome}
      />,
    );

  it('says an admin held the price', () => {
    renderWith({
      outcome: 'held',
      submissionId: 's1',
      resolvedAt: '2026-11-13T12:00:00.000Z',
      previous: null,
    });
    expect(screen.getByTestId('price-check-outcome').dataset['outcome']).toBe(
      'held',
    );
    expect(
      screen.getByText('Checked by an admin. This number held.'),
    ).toBeDefined();
  });

  it('says the price was updated, and what it was', () => {
    renderWith({
      outcome: 'updated',
      submissionId: 's1',
      resolvedAt: '2026-11-13T12:00:00.000Z',
      previous: { floor: 44, ceiling: null },
    });
    expect(
      screen.getByText('Updated after a price check. Was $44.'),
    ).toBeDefined();
  });

  it('draws a previous range as a range', () => {
    renderWith({
      outcome: 'updated',
      submissionId: 's1',
      resolvedAt: '2026-11-13T12:00:00.000Z',
      previous: { floor: 44, ceiling: 60 },
    });
    expect(
      screen.getByText('Updated after a price check. Was $44–$60.'),
    ).toBeDefined();
  });

  // An update with no price it replaced has nothing true to say, and must not
  // fall through to the "held" line.
  it('draws nothing for an update that carries no previous price', () => {
    renderWith({
      submissionId: 's1',
      outcome: 'updated',
      resolvedAt: '2026-11-13T12:00:00.000Z',
      previous: null,
    });
    expect(screen.queryByTestId('price-check-outcome')).toBeNull();
    expect(screen.queryByText(/This number held/)).toBeNull();
  });

  it('draws nothing when there is no outcome', () => {
    renderWith(null);
    expect(screen.queryByTestId('price-check-outcome')).toBeNull();
  });
});
