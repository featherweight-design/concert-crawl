// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MTAddTierSuccess } from './MTAddTierSuccess'

afterEach(() => {
  cleanup()
})

const AZURE_NORM = 'oklch(0.62 0.12 240)'

describe('MTAddTierSuccess', () => {
  it('state #1 — first tier submitted: success eyebrow + check glyph + headline + body with azure pending fragment', () => {
    const { container } = render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={[]}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    // Headline
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
    // Body — joined together: "$25 box office · sits pending · 1/2 until one more fan confirms."
    expect(container.textContent?.includes('$25 box office · ')).toBe(true)
    // Pending fragment in azure via <strong>
    const pendingEl = screen.getByText(
      'sits pending · 1/2 until one more fan confirms.',
    )
    expect(pendingEl.tagName).toBe('STRONG')
    expect((pendingEl as HTMLElement).style.color).toBe(AZURE_NORM)
    // Check glyph svg present
    expect(container.querySelector('svg')).not.toBeNull()
  })

  // Regression: the fragment used to hardcode "1/2 ... one more fan", so an
  // imminent show (SP_POLICY.confirmsRequiredImminent = 3) had the success
  // surface contradicting the pending rail's "1 of 3 confirmed · 2 to go"
  // right above it.
  it('state #1 imminent — denominator and remaining-fan count follow confirmsNeeded', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={238}
        submittedSourceCategory="resale"
        remainingTiers={[]}
        confirmsNeeded={3}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(
      screen.getByText('sits pending · 1/3 until two more fans confirm.'),
    ).toBeDefined()
    expect(screen.queryByText(/1\/2 until one more fan/)).toBeNull()
  })

  it('state #2 — renders + Add reserved, + Add vip pills when remainingTiers=[Reserved, VIP]', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={['Reserved', 'VIP']}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    // Eyebrow
    expect(screen.getByText('This show has more than one tier?')).toBeDefined()
    // Pills — the "+ " prefix is split between a <span>+</span> and the text label
    expect(screen.getByText('Add reserved')).toBeDefined()
    expect(screen.getByText('Add vip')).toBeDefined()
    expect(screen.getByText('Done')).toBeDefined()
  })

  it('state #3 — clicking a pill fires onAddTier with the picked tier', () => {
    const onAddTier = vi.fn()
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={['Reserved', 'VIP']}
        confirmsNeeded={2}
        onAddTier={onAddTier}
        onDone={() => {}}
      />,
    )
    const vipButton = screen.getByText('Add vip').closest('button')
    expect(vipButton).not.toBeNull()
    fireEvent.click(vipButton!)
    expect(onAddTier).toHaveBeenCalledTimes(1)
    expect(onAddTier).toHaveBeenCalledWith('VIP')
  })

  it('state #4 (LOCKED §9 Q4-eng) — empty remainingTiers collapses to Done only (no add-another section)', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={[]}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(screen.queryByText('This show has more than one tier?')).toBeNull()
    expect(screen.queryByText('Add reserved')).toBeNull()
    expect(screen.queryByText('Add vip')).toBeNull()
    expect(screen.getByText('Done')).toBeDefined()
  })

  it('clicking Done fires onDone', () => {
    const onDone = vi.fn()
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={[]}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={onDone}
      />,
    )
    const doneButton = screen.getByText('Done').closest('button')
    expect(doneButton).not.toBeNull()
    fireEvent.click(doneButton!)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('limitReached hides add-tier pills and shows exhausted copy instead (#876)', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={['Reserved', 'VIP']}
        confirmsNeeded={2}
        limitReached
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(screen.queryByText('This show has more than one tier?')).toBeNull()
    expect(screen.queryByText('Add reserved')).toBeNull()
    expect(screen.queryByText('Add vip')).toBeNull()
    expect(
      screen.getByText(
        "That's your three for this show today. If prices change, come back tomorrow.",
      ),
    ).toBeDefined()
    expect(screen.getByText('Done')).toBeDefined()
  })

  it('limitReached omitted keeps pills when tiers remain (#876)', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={['Reserved']}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(screen.getByText('This show has more than one tier?')).toBeDefined()
    expect(screen.getByText('Add reserved')).toBeDefined()
    expect(
      screen.queryByText(
        "That's your three for this show today. If prices change, come back tomorrow.",
      ),
    ).toBeNull()
  })

  it('limitReached with no remaining tiers shows exhausted copy, not silence (#876)', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={[]}
        confirmsNeeded={2}
        limitReached
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(
      screen.getByText(
        "That's your three for this show today. If prices change, come back tomorrow.",
      ),
    ).toBeDefined()
  })

  it('source category labels render correctly for standard and resale', () => {
    const { container, rerender } = render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={30}
        submittedSourceCategory="standard"
        remainingTiers={[]}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(container.textContent?.includes('$30 standard · ')).toBe(true)

    rerender(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={85}
        submittedSourceCategory="resale"
        remainingTiers={[]}
        confirmsNeeded={2}
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(container.textContent?.includes('$85 resale · ')).toBe(true)
  })
})
