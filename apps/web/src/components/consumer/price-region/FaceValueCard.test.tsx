// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { FaceValueCard } from './FaceValueCard'

afterEach(() => {
  cleanup()
})

describe('FaceValueCard', () => {
  describe('variant="default" (state #10 — sold-out + resale)', () => {
    it('renders eyebrow, headline, resale row, ghost box-office row, and default CTA', () => {
      const onAddPrice = vi.fn()
      render(
        <FaceValueCard
          variant="default"
          resaleVendor="Ticketmaster"
          resaleRange="$110–180"
          onAddPrice={onAddPrice}
        />,
      )

      // Eyebrow
      expect(screen.getByText('Face value ≠ resale')).toBeDefined()

      // Headline + subline
      expect(screen.getByText("That's resale, not face value.")).toBeDefined()
      expect(
        screen.getByText(
          'Only resale tickets left. Know the box-office price? Add it.',
        ),
      ).toBeDefined()

      // Resale row — label, sub (built from vendor), and range
      expect(screen.getByText('Resale')).toBeDefined()
      expect(
        screen.getByText('Ticketmaster · marked up over face'),
      ).toBeDefined()
      expect(screen.getByText('$110–180')).toBeDefined()

      // Box-office ghost row
      expect(screen.getByText('Box office')).toBeDefined()
      expect(screen.getByText('the printed price · no fees')).toBeDefined()
      expect(screen.getByText('not reported')).toBeDefined()

      // CTA + caption
      const button = screen.getByRole('button', {
        name: /add the box-office price/i,
      })
      expect(button).toBeDefined()
      expect(screen.getByText('Goes live once fans confirm')).toBeDefined()

      // Clicking the CTA fires onAddPrice
      fireEvent.click(button)
      expect(onAddPrice).toHaveBeenCalledTimes(1)
    })

    it('falls back to fallback right-value copy when resaleRange is omitted', () => {
      render(
        <FaceValueCard
          variant="default"
          resaleVendor="Ticketmaster"
          onAddPrice={() => {}}
        />,
      )
      expect(screen.getByText('available, above face value')).toBeDefined()
    })
  })

  describe('variant="no-price" (state #12 — no-price + resale)', () => {
    it('switches headline + CTA copy; subline + ladder unchanged', () => {
      const onAddPrice = vi.fn()
      render(
        <FaceValueCard
          variant="no-price"
          resaleVendor="Ticketmaster"
          resaleRange="$110–180"
          onAddPrice={onAddPrice}
        />,
      )

      // Headline override
      expect(screen.getByText('All we can see is resale.')).toBeDefined()

      // Subline is the same
      expect(
        screen.getByText(
          'Only resale tickets left. Know the box-office price? Add it.',
        ),
      ).toBeDefined()

      // CTA copy override
      const button = screen.getByRole('button', {
        name: /add a price you've seen/i,
      })
      expect(button).toBeDefined()

      fireEvent.click(button)
      expect(onAddPrice).toHaveBeenCalledTimes(1)
    })
  })

  it('uses the 12×12 viewBox star path for the ghost box-office row glyph', () => {
    // Property-table-locked spec: the ghost row's star uses viewBox "0 0 12 12"
    // and the fuller `TIER_MARK_STAR_PATH`, NOT the 10×10 chip-scale StarGlyph.
    const { container } = render(
      <FaceValueCard
        variant="default"
        resaleVendor="Ticketmaster"
        resaleRange="$110–180"
        onAddPrice={() => {}}
      />,
    )
    const star = container.querySelector('svg[viewBox="0 0 12 12"]')
    expect(star).not.toBeNull()
    const path = star?.querySelector('path')
    expect(path?.getAttribute('d')).toBe(
      'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z',
    )
  })
})
