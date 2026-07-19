// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const entitlementState: { current: EntitlementResult } = {
  current: { isLoading: true, active: false, surface: null },
}

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlementState.current,
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

// The real tier picker pulls in checkout wiring — stub it down to a marker
// that exposes open/entry so routing assertions stay cheap.
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

import { TasteFilterChip } from './TasteFilterChip'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const COPY = SPOTIFY_COPY.tasteFilter

const renderChip = (
  overrides: Partial<React.ComponentProps<typeof TasteFilterChip>> = {},
) =>
  render(
    <TasteFilterChip
      active={false}
      onToggle={vi.fn()}
      scaRegion={false}
      {...overrides}
    />,
  )

describe('TasteFilterChip', () => {
  it('renders nothing while the entitlement is resolving', () => {
    entitlementState.current = { isLoading: true, active: false, surface: null }
    const { container } = renderChip()
    expect(container.innerHTML).toBe('')
  })

  it('renders an off toggle for entitled viewers and toggles on', () => {
    entitlementState.current = {
      isLoading: false,
      active: true,
      surface: 'visible-active',
    }
    const onToggle = vi.fn()
    renderChip({ onToggle })
    const chip = screen.getByRole('button', { name: COPY.chipAria })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(chip)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('shows the active treatment and toggles off', () => {
    entitlementState.current = {
      isLoading: false,
      active: true,
      surface: 'visible-active',
    }
    const onToggle = vi.fn()
    renderChip({ active: true, onToggle })
    const chip = screen.getByRole('button', { name: COPY.chipAria })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(chip)
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('releases a stale active filter when the entitlement resolves locked', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    const onToggle = vi.fn()
    renderChip({ active: true, onToggle })
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('locked (free/supporter) taps open the upsell, then See plans opens the picker', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    const onToggle = vi.fn()
    renderChip({ onToggle })
    const chip = screen.getByRole('button', { name: COPY.chipLockedAria })
    // Locked chip stays operable for AT — the paid state lives in the label.
    expect(chip.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(chip)
    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByText(COPY.upsell.title)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.upsell.cta }))
    const picker = screen.getByTestId('tier-picker')
    expect(picker.getAttribute('data-entry')).toBe('paywall')
  })

  it('locked (logged-out) taps open the tier picker directly', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderChip()
    fireEvent.click(screen.getByRole('button', { name: COPY.chipLockedAria }))
    expect(screen.queryByText(COPY.upsell.title)).toBeNull()
    const picker = screen.getByTestId('tier-picker')
    expect(picker.getAttribute('data-entry')).toBe('logged-out-paywall')
  })
})
