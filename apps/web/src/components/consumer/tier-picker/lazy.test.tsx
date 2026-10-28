// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const loads = vi.fn()

// Stand-in for next/dynamic that records when the import starts.
vi.mock('next/dynamic', () => ({
  default: () => (props: { open: boolean }) => {
    loads()
    return props.open ? <div data-testid="sheet">open</div> : null
  },
}))

import { TierPickerSheet } from './lazy'
import type { TierPickerSheetProps } from './TierPickerSheet'

const props = (open: boolean): TierPickerSheetProps => ({
  open,
  onClose: () => {},
  planState: {
    plan: 'free',
    onTrial: false,
    trialEndsAt: null,
    status: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    roleComped: false,
  },
  scaRegion: false,
  entry: 'paywall',
})

afterEach(() => {
  cleanup()
  loads.mockReset()
})

describe('lazy TierPickerSheet', () => {
  it('does not mount the dynamic sheet while it has never been opened', () => {
    render(<TierPickerSheet {...props(false)} />)
    expect(loads).not.toHaveBeenCalled()
  })

  it('mounts on first open and stays mounted after closing', () => {
    const { rerender } = render(<TierPickerSheet {...props(false)} />)
    rerender(<TierPickerSheet {...props(true)} />)
    expect(screen.getByTestId('sheet')).toBeTruthy()
    rerender(<TierPickerSheet {...props(false)} />)
    expect(loads).toHaveBeenCalledTimes(2)
  })
})
