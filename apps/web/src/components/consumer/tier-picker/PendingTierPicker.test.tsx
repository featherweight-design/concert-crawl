// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

let searchParams = new URLSearchParams()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/events/e1',
  useRouter: () => ({ replace }),
}))

const planData = vi.fn<() => unknown>(() => ({ plan: 'free' }))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: planData() }),
}))

// The sheet's own behaviour has its own suite; here it only has to report the
// props that decide whether the reopen happened and on which card.
vi.mock('./TierPickerSheet', () => ({
  TierPickerSheet: ({
    initialTier,
    entry,
  }: {
    initialTier?: string | null
    entry?: string
  }) => (
    <div
      data-testid="sheet"
      data-initial-tier={initialTier}
      data-entry={entry}
    />
  ),
}))

import { PendingTierPicker } from './PendingTierPicker'

beforeEach(() => {
  searchParams = new URLSearchParams()
  replace.mockClear()
  planData.mockReturnValue({ plan: 'free' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const sheet = () => screen.queryByTestId('sheet')

describe('PendingTierPicker — reopening on a pre-account choice (#1284)', () => {
  it('does nothing at all without a tier param', () => {
    render(<PendingTierPicker />)
    expect(sheet()).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })

  it('reopens on the tier that was chosen', () => {
    searchParams = new URLSearchParams({ tier: 'premium' })
    render(<PendingTierPicker />)
    expect(sheet()?.getAttribute('data-initial-tier')).toBe('premium')
    expect(sheet()?.getAttribute('data-entry')).toBe('post-signup')
  })

  it('stays shut for free — signing up already delivered it', () => {
    searchParams = new URLSearchParams({ tier: 'free' })
    render(<PendingTierPicker />)
    expect(sheet()).toBeNull()
    // Still stripped, or the param survives every later navigation.
    expect(replace).toHaveBeenCalledWith('/events/e1', { scroll: false })
  })

  it('stays shut for a tier nobody offers', () => {
    searchParams = new URLSearchParams({ tier: 'platinum' })
    render(<PendingTierPicker />)
    expect(sheet()).toBeNull()
    expect(replace).toHaveBeenCalledWith('/events/e1', { scroll: false })
  })

  it("strips the param but keeps the destination's own query", () => {
    searchParams = new URLSearchParams({ tab: 'prices', tier: 'premium' })
    render(<PendingTierPicker />)
    expect(replace).toHaveBeenCalledWith('/events/e1?tab=prices', {
      scroll: false,
    })
  })

  it('leaves the URL alone while a watch intent is still pending', () => {
    // Both readers strip through the same helper. Stripping first would take
    // the intent with it and the watch replay would never run.
    searchParams = new URLSearchParams({
      tier: 'premium',
      intent: 'watch:3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01',
    })
    render(<PendingTierPicker />)
    expect(replace).not.toHaveBeenCalled()
    // The sheet still opens — the two halves of the seam are independent.
    expect(sheet()?.getAttribute('data-initial-tier')).toBe('premium')
  })

  it('holds the sheet back until the plan is known', () => {
    searchParams = new URLSearchParams({ tier: 'premium' })
    planData.mockReturnValue(undefined)
    const { rerender } = render(<PendingTierPicker />)
    // Rendering against a guessed plan would show the wrong cards and CTAs.
    expect(sheet()).toBeNull()

    planData.mockReturnValue({ plan: 'free' })
    rerender(<PendingTierPicker />)
    expect(sheet()?.getAttribute('data-initial-tier')).toBe('premium')
  })

  it('stays open after the param it was built from is stripped', () => {
    searchParams = new URLSearchParams({ tier: 'premium' })
    const { rerender } = render(<PendingTierPicker />)
    searchParams = new URLSearchParams()
    rerender(<PendingTierPicker />)
    expect(sheet()?.getAttribute('data-initial-tier')).toBe('premium')
  })
})
