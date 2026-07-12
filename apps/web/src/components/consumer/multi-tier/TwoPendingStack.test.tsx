// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TwoPendingStack } from './TwoPendingStack'
import type { PendingCardBProps } from '@/components/consumer/PendingCardB'

const buildCard = (
  overrides: Partial<PendingCardBProps> = {},
): PendingCardBProps => ({
  floor: 25,
  ceiling: null,
  tier: 'GA',
  vendor: 'AXS',
  kind: 'community',
  submitter: null,
  submittedAt: new Date().toISOString(),
  confirms: 1,
  needed: 2,
  view: 'submitter',
  note: null,
  onConfirm: vi.fn(),
  onWithdraw: vi.fn(),
  onEdit: vi.fn(),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe('TwoPendingStack', () => {
  it('renders a single card', () => {
    render(<TwoPendingStack cards={[buildCard({ floor: 25 })]} />)
    expect(screen.getByText('$25')).toBeTruthy()
  })

  it('renders two cards', () => {
    render(
      <TwoPendingStack
        cards={[
          buildCard({ floor: 25 }),
          buildCard({ floor: 50, tier: 'Pit' }),
        ]}
      />,
    )
    expect(screen.getByText('$25')).toBeTruthy()
    expect(screen.getByText('$50')).toBeTruthy()
  })

  // Regression: a batch of 3+ tiers must show every card. The old
  // implementation hard-rendered only cards[0]/cards[1], silently dropping
  // the third tier on reload (all-tiers-pending path routed every count
  // through this component).
  it('renders every card when given three or more', () => {
    render(
      <TwoPendingStack
        cards={[
          buildCard({ floor: 25, tier: 'GA' }),
          buildCard({ floor: 50, tier: 'Reserved' }),
          buildCard({ floor: 99, tier: 'VIP' }),
        ]}
      />,
    )
    expect(screen.getByText('$25')).toBeTruthy()
    expect(screen.getByText('$50')).toBeTruthy()
    expect(screen.getByText('$99')).toBeTruthy()
  })
})
