// @vitest-environment jsdom

// Regression pins for the PR 3.1 review round 1: past_due must outrank the
// celebratory founder/gifted card, and free/logged-out must never fall
// through to the paid "Supporter" card.

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { PlanState } from '@concert-crawl/types'
import { PlanCard } from './PlanCard'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const PLAN_CARD_COPY = CONSUMER_COPY.settings.planCard

const basePlanState: PlanState = {
  plan: 'free',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

describe('PlanCard', () => {
  it('shows the past-due warning for a founder in dunning, not the celebratory card', () => {
    render(
      <PlanCard
        planState={{ ...basePlanState, plan: 'founder', status: 'past_due' }}
      />,
    )
    expect(screen.getByText(PLAN_CARD_COPY.pastDue.tagline)).toBeTruthy()
    expect(screen.queryByText(PLAN_CARD_COPY.founder.tagline)).toBeNull()
  })

  it('shows the past-due warning for a role-comped user in dunning', () => {
    render(
      <PlanCard
        planState={{
          ...basePlanState,
          plan: 'premium',
          roleComped: true,
          status: 'past_due',
        }}
      />,
    )
    expect(screen.getByText(PLAN_CARD_COPY.pastDue.tagline)).toBeTruthy()
  })

  it('shows the celebratory card for a founder in good standing', () => {
    render(
      <PlanCard
        planState={{ ...basePlanState, plan: 'founder', status: 'active' }}
      />,
    )
    expect(screen.getByText(PLAN_CARD_COPY.founder.tagline)).toBeTruthy()
  })

  it('shows the free card for plan free, never the paid Supporter card', () => {
    render(<PlanCard planState={basePlanState} />)
    expect(screen.getByText(PLAN_CARD_COPY.free.tagline)).toBeTruthy()
    expect(screen.queryByText(PLAN_CARD_COPY.paid.tagline)).toBeNull()
  })

  it('shows the free card for logged-out', () => {
    render(<PlanCard planState={{ ...basePlanState, plan: 'logged-out' }} />)
    expect(screen.getByText(PLAN_CARD_COPY.free.tagline)).toBeTruthy()
  })

  it('shows the paid card for supporter and premium', () => {
    for (const plan of ['supporter', 'premium'] as const) {
      const { unmount } = render(
        <PlanCard planState={{ ...basePlanState, plan, status: 'active' }} />,
      )
      expect(screen.getByText(PLAN_CARD_COPY.paid.tagline)).toBeTruthy()
      unmount()
    }
  })
})
