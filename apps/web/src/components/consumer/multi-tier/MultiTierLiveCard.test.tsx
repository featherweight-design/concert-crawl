// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MultiTierLiveCard } from './MultiTierLiveCard'

afterEach(() => {
  cleanup()
})

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
    )
    expect(screen.getByText('$25')).toBeDefined()
    expect(screen.getByText('GA')).toBeDefined()
    // PendingTrustPill renders "Box office" when kind=boxoffice
    expect(screen.getByText('Box office')).toBeDefined()
    expect(screen.getByText('seen on Bluebird')).toBeDefined()
  })

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
    )
    expect(screen.getByText('Community')).toBeDefined()
  })

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
    )
    // PendingTrustPill renders "Resale" when kind=resale
    const pill = screen.getByText('Resale')
    expect(pill).toBeDefined()
    // Coral pill background — JSDOM normalizes 0.20 → 0.2.
    const pillEl = pill as HTMLElement
    expect(pillEl.style.background).toContain('oklch(0.65 0.2 25)')
  })

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
    )
    // Single text node: "seen on AXS · 3 reports"
    expect(screen.getByText('seen on AXS · 3 reports')).toBeDefined()
  })

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
    )
    expect(screen.getByText('seen on AXS')).toBeDefined()
    expect(screen.queryByText(/reports/)).toBeNull()
  })

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
    )
    expect(screen.getByText('seen on AXS')).toBeDefined()
    expect(screen.queryByText(/reports/)).toBeNull()
  })

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
    )
    // Alternate row vendor + price visible
    expect(screen.getByText('StubHub')).toBeDefined()
    expect(screen.getByText('$150')).toBeDefined()
    // Look for the coral dot in the alternate row.
    const dots = Array.from(
      container.querySelectorAll('div[style*="border-radius: 2.5px"]'),
    )
    const coral = dots.find((dot) =>
      (dot as HTMLElement).style.background.includes('oklch(0.65 0.2 25)'),
    )
    expect(coral).toBeDefined()
  })
})

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
    )

  it('warns when the headline price is older than a day', () => {
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    ).toISOString()
    renderAt(eightDaysAgo)
    expect(screen.getByText('as of 8d ago, could be stale')).toBeDefined()
  })

  it('states the age without the warning when the price is fresh', () => {
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    renderAt(anHourAgo)
    expect(screen.getByText('as of 1h ago')).toBeDefined()
  })

  it('renders no stamp when the observation time is unknown', () => {
    renderAt(null)
    expect(screen.queryByText(/as of/)).toBeNull()
  })
})
