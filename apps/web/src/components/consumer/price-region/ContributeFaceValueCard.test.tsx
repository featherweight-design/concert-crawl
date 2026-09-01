// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ContributeFaceValueCard } from './ContributeFaceValueCard'

afterEach(() => {
  cleanup()
})

describe('ContributeFaceValueCard (state #11 — Q1 contribution-only)', () => {
  it('renders the "Face value" eyebrow (NOT "Face value ≠ resale")', () => {
    render(<ContributeFaceValueCard onAddPrice={() => {}} />)
    expect(screen.getByText('Face value')).toBeDefined()
    expect(screen.queryByText('Face value ≠ resale')).toBeNull()
  })

  it('renders headline + subline copy per Appendix A.1', () => {
    render(<ContributeFaceValueCard onAddPrice={() => {}} />)
    expect(screen.getByText('No price to show. Yet.')).toBeDefined()
    expect(
      screen.getByText(
        'Sold out, nothing listed. Know the box-office number? Add it.',
      ),
    ).toBeDefined()
  })

  it('renders exactly ONE ghost box-office row (no resale row)', () => {
    render(<ContributeFaceValueCard onAddPrice={() => {}} />)

    // The box-office row is present with the locked copy
    expect(screen.getByText('Box office')).toBeDefined()
    expect(screen.getByText('the printed price · no fees')).toBeDefined()
    expect(screen.getByText('not reported')).toBeDefined()

    // No resale row — the resale label is absent, and so is the
    // vendor·marked-up sub copy.
    expect(screen.queryByText('Resale')).toBeNull()
    expect(screen.queryByText(/marked up over face/i)).toBeNull()
  })

  it('renders CTA + caption and fires onAddPrice on click', () => {
    const onAddPrice = vi.fn()
    render(<ContributeFaceValueCard onAddPrice={onAddPrice} />)

    const button = screen.getByRole('button', {
      name: /add the box-office price/i,
    })
    expect(button).toBeDefined()
    expect(screen.getByText('Goes live once fans confirm')).toBeDefined()

    fireEvent.click(button)
    expect(onAddPrice).toHaveBeenCalledTimes(1)
  })

  it('renders NO ProvenanceCTA — no outbound link anywhere in the subtree', () => {
    // Critical Q1 assertion: there is NO outbound link slot. A ProvenanceCTA
    // is an <a target="_blank">; if any anchor renders, the contract is broken.
    const { container } = render(
      <ContributeFaceValueCard onAddPrice={() => {}} />,
    )
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('uses the 12×12 viewBox star for the ghost box-office row glyph', () => {
    // Property-table-locked spec (Appendix A.1 line 807): viewBox "0 0 12 12"
    // with the fuller `TIER_MARK_STAR_PATH`, NOT the 10×10 chip-scale StarGlyph.
    const { container } = render(
      <ContributeFaceValueCard onAddPrice={() => {}} />,
    )
    const star = container.querySelector('svg[viewBox="0 0 12 12"]')
    expect(star).not.toBeNull()
    const path = star?.querySelector('path')
    expect(path?.getAttribute('d')).toBe(
      'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z',
    )
  })
})
