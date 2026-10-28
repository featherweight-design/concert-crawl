// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'

const entitlementState: { current: EntitlementResult } = {
  current: { isLoading: true, active: false, surface: null },
}

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlementState.current,
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

import { FollowFilterChip } from './FollowFilterChip'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'

const ENTITLED: EntitlementResult = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
}

const renderChip = (
  overrides: Partial<React.ComponentProps<typeof FollowFilterChip>> = {},
) =>
  render(
    <FollowFilterChip
      active={false}
      onToggle={vi.fn()}
      followCount={3}
      scaRegion={false}
      {...overrides}
    />,
  )

describe('FollowFilterChip', () => {
  it('renders nothing while the entitlement is resolving', () => {
    entitlementState.current = { isLoading: true, active: false, surface: null }
    const { container } = renderChip()
    expect(container.innerHTML).toBe('')
  })

  it('off: entitled with follows toggles the scope on', () => {
    entitlementState.current = ENTITLED
    const onToggle = vi.fn()
    renderChip({ onToggle })
    const chip = screen.getByRole('button', { name: FOLLOWING_COPY.chipAria })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(chip.textContent).toContain(FOLLOWING_COPY.chip)
    fireEvent.click(chip)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('on: carries the count in the label and clears', () => {
    entitlementState.current = ENTITLED
    const onToggle = vi.fn()
    renderChip({ active: true, followCount: 12, onToggle })
    const chip = screen.getByRole('button', {
      name: FOLLOWING_COPY.chipActiveAria,
    })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(chip.textContent).toContain(FOLLOWING_COPY.chipActive(12))
    fireEvent.click(chip)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('absent: entitled with zero follows renders nothing', () => {
    entitlementState.current = ENTITLED
    const { container } = renderChip({ followCount: 0 })
    expect(container.innerHTML).toBe('')
  })

  it('absent never swallows an applied scope — a stale URL stays clearable', () => {
    entitlementState.current = ENTITLED
    renderChip({ followCount: 0, active: true })
    expect(screen.getByTestId('follow-scope-chip')).toBeTruthy()
  })

  it('unknown count keeps the chip rather than hiding it', () => {
    entitlementState.current = ENTITLED
    renderChip({ followCount: null })
    expect(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    ).toBeTruthy()
  })

  it('an active chip with an unknown count drops the number, never prints 0', () => {
    entitlementState.current = ENTITLED
    renderChip({ followCount: null, active: true })
    const chip = screen.getByTestId('follow-scope-chip')
    // The ✕ clear glyph rides an active chip, so assert on the label rather
    // than the whole node: the point is that no count, and specifically no
    // zero, reaches the string.
    expect(chip.textContent).toContain(FOLLOWING_COPY.chip)
    expect(chip.textContent).not.toContain('·')
    expect(chip.textContent).not.toContain('0')
  })

  // D1: entitlement is read BEFORE the count, so the paywall is reachable from
  // browse for a free user who has never followed anyone.
  it('locked beats absent for a free viewer with zero follows', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    renderChip({ followCount: 0 })
    const chip = screen.getByRole('button', {
      name: FOLLOWING_COPY.chipAria,
    })
    expect(chip.getAttribute('aria-disabled')).toBeNull()
    expect(chip.getAttribute('aria-pressed')).toBeNull()
  })

  it('locked taps open the picker at the paywall entry', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    const onToggle = vi.fn()
    renderChip({ onToggle })
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    )
    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'paywall',
    )
  })

  it('locked (logged out) opens the picker at the logged-out entry', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderChip()
    fireEvent.click(
      screen.getByRole('button', { name: FOLLOWING_COPY.chipAria }),
    )
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'logged-out-paywall',
    )
  })

  it('releases a stale active scope once the entitlement resolves locked', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    const onToggle = vi.fn()
    renderChip({ active: true, onToggle })
    expect(onToggle).toHaveBeenCalledWith(false)
  })
})
