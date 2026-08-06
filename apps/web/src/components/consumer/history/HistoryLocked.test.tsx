// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

// The real picker drags in the whole checkout tree; a marker is enough to
// assert the CTA routes into it.
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

import { HistoryLocked } from './HistoryLocked'
import { HISTORY_COPY } from './definitions/copy'
import { unlockTierFor } from '@/lib/unlock-tier'

afterEach(cleanup)

const COPY = HISTORY_COPY.locked

// Derived, never named. Which tier unlocks History has already moved once
// (#1225), and its price is design data — asserting either literally would make
// this suite fail on a change it is not testing.
const tier = unlockTierFor('concert-history')
if (tier === null)
  throw new Error('concert-history unlocks no purchasable tier')

describe('HistoryLocked', () => {
  it('renders as a takeover, not a dialog — no modal chrome, no dismiss', () => {
    render(<HistoryLocked scaRegion={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /close|dismiss/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: COPY.headline }),
    ).toBeInTheDocument()
  })

  it('sources the perk list from the canonical tier-picker features', () => {
    render(<HistoryLocked scaRegion={false} />)

    const rendered = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent)

    // Asserting against the canonical definition is the point: if that list
    // changes and this surface forks its own copy, CI fails.
    expect(rendered).toEqual(tier.features.map((feature) => feature.text))
  })

  it('renders the honest footer and no teased stats', () => {
    render(<HistoryLocked scaRegion={false} />)

    expect(screen.getByText(COPY.footer)).toBeInTheDocument()
    // v1 hides Free-tier stats outright — no blurred "?? nights" preview.
    expect(screen.queryByText(/\?\?/)).not.toBeInTheDocument()
  })

  it('opens the tier picker from the paywall entry on the CTA', () => {
    render(<HistoryLocked scaRegion={false} />)

    expect(screen.queryByTestId('tier-picker')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: COPY.cta(tier.name) }))

    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'paywall',
    )
  })

  it('names the unlocking tier and its price from the tier definitions', () => {
    render(<HistoryLocked scaRegion={false} />)

    expect(
      screen.getByText(`${tier.name} · ${tier.priceText} ${tier.priceUnit}`),
    ).toBeInTheDocument()
  })
})
