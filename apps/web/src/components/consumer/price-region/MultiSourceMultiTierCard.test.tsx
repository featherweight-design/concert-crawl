// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MultiSourceMultiTierCard } from './MultiSourceMultiTierCard'

afterEach(() => {
  cleanup()
})

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
  }

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
    )

    // Eyebrow
    expect(screen.getByText('Tickets')).toBeDefined()
    // Headline parts
    expect(screen.getByText('from')).toBeDefined()
    expect(screen.getByText('$20')).toBeDefined()
    expect(screen.getByText('GA')).toBeDefined()
    // Meta template — populated with the headline vendor
    expect(
      screen.getByText('seen on Venue · face value · no fees'),
    ).toBeDefined()
  })

  it('renders "Or pay for convenience" eyebrow + cross-source resale row', () => {
    render(<MultiSourceMultiTierCard {...baseProps} otherTiers={[]} />)

    expect(screen.getByText('Or pay for convenience')).toBeDefined()
    // AltSourceRow contents
    expect(screen.getByText('Ticketmaster')).toBeDefined()
    expect(screen.getByText('resale')).toBeDefined()
    expect(screen.getByText('$35')).toBeDefined()
  })

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
    )

    expect(screen.getByText('Other tiers')).toBeDefined()
    expect(screen.getByText('VIP')).toBeDefined()
    expect(screen.getByText('Venue')).toBeDefined()
    expect(screen.getByText('$80')).toBeDefined()
  })

  it('omits the "Other tiers" section when otherTiers is empty', () => {
    render(<MultiSourceMultiTierCard {...baseProps} otherTiers={[]} />)

    expect(screen.queryByText('Other tiers')).toBeNull()
  })
})
