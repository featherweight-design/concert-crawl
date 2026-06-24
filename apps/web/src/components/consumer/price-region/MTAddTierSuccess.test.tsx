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

  it('state #2 — renders + Add reserved, + Add vip pills when remainingTiers=[Reserved, VIP]', () => {
    render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={25}
        submittedSourceCategory="boxoffice"
        remainingTiers={['Reserved', 'VIP']}
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
        onAddTier={() => {}}
        onDone={onDone}
      />,
    )
    const doneButton = screen.getByText('Done').closest('button')
    expect(doneButton).not.toBeNull()
    fireEvent.click(doneButton!)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('source category labels render correctly for standard and resale', () => {
    const { container, rerender } = render(
      <MTAddTierSuccess
        submittedTier="GA"
        submittedPrice={30}
        submittedSourceCategory="standard"
        remainingTiers={[]}
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
        onAddTier={() => {}}
        onDone={() => {}}
      />,
    )
    expect(container.textContent?.includes('$85 resale · ')).toBe(true)
  })
})
