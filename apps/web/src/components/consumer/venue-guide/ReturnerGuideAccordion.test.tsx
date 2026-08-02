// @vitest-environment jsdom

import '@testing-library/jest-dom'
import type { VenueGuide, VenueGuideChip } from '@concert-crawl/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CONSUMER_COPY } from '../definitions/copy'
import { GuideSection } from './GuideSection'

afterEach(cleanup)

const copy = CONSUMER_COPY.venueGuide

const chip = (
  chipType: VenueGuideChip['chipType'],
  body: string,
): VenueGuideChip => ({ chipType, body, isPlaceholder: false })

const guide = (overrides: Partial<VenueGuide> = {}): VenueGuide => ({
  chips: [
    chip('accessibility', 'Ramp at stage left.'),
    chip('parking', 'Lot on 13th, $10.'),
    chip('transit', 'RTD 15 stops out front.'),
    chip('food_drink', 'Tacos next door.'),
  ],
  insiderTip: 'Bar upstairs is never busy.',
  publishedAt: '2026-08-01T12:00:00.000Z',
  ...overrides,
})

const renderReturner = (overrides: Partial<VenueGuide> = {}) =>
  render(
    <GuideSection
      venueName="The Roxy"
      guide={guide(overrides)}
      mode="returner"
    />,
  )

describe('ReturnerGuideAccordion', () => {
  it('collapses the guide by default and hides the section header', () => {
    renderReturner()
    expect(screen.getByTestId('returner-guide-accordion')).toBeInTheDocument()
    expect(screen.queryByText(copy.sectionTitle)).toBeNull()
    expect(screen.queryByTestId('guide-chip-accessibility')).toBeNull()
    expect(screen.queryByTestId('guide-insider-tip')).toBeNull()
  })

  it('previews three topic labels and a +N for the rest', () => {
    renderReturner()
    expect(
      screen.getByText(
        copy.returner.preview(
          [
            copy.chipLabels.accessibility,
            copy.chipLabels.parking,
            copy.chipLabels.food_drink,
          ],
          1,
        ),
      ),
    ).toBeInTheDocument()
  })

  it('omits the +N suffix at exactly three authored chips', () => {
    renderReturner({
      chips: [
        chip('accessibility', 'Ramp at stage left.'),
        chip('parking', 'Lot on 13th, $10.'),
        chip('transit', 'RTD 15 stops out front.'),
      ],
    })
    expect(
      screen.getByTestId('returner-guide-accordion').textContent,
    ).not.toContain('+')
  })

  it('exposes an accessible toggle that meets the 44px tap floor', () => {
    renderReturner()
    const toggle = screen.getByRole('button', {
      name: copy.returner.toggleAriaLabel,
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle.style.minHeight).toBe('44px')
  })

  it('describes the toggle with the preview text, which aria-label alone would hide', () => {
    renderReturner()
    const toggle = screen.getByRole('button', {
      name: copy.returner.toggleAriaLabel,
    })
    const describedBy = toggle.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      copy.returner.preview(
        [
          copy.chipLabels.accessibility,
          copy.chipLabels.parking,
          copy.chipLabels.food_drink,
        ],
        1,
      ),
    )

    fireEvent.click(toggle)
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      copy.returner.expandedSummary,
    )
  })

  it('toggles open and shut from a native button, so Enter and Space work for free', () => {
    renderReturner()
    const toggle = screen.getByRole('button', {
      name: copy.returner.toggleAriaLabel,
    })
    // Keyboard activation is the browser's, not ours — asserting the element is
    // a real <button type="button"> is what actually guarantees Enter/Space.
    expect(toggle.tagName).toBe('BUTTON')
    expect(toggle).toHaveAttribute('type', 'button')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('leads the expanded body with the insider tip, then the chips', () => {
    renderReturner()
    fireEvent.click(
      screen.getByRole('button', { name: copy.returner.toggleAriaLabel }),
    )

    const tip = screen.getByTestId('guide-insider-tip')
    const firstChip = screen.getByTestId('guide-chip-accessibility')
    expect(
      tip.compareDocumentPosition(firstChip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByText(copy.returner.expandedSummary)).toBeInTheDocument()
  })

  it('never shows the still-gathering note, even on a thin guide', () => {
    renderReturner({
      chips: [chip('accessibility', 'Ramp at stage left.')],
      insiderTip: null,
    })
    expect(screen.getByTestId('returner-guide-accordion')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: copy.returner.toggleAriaLabel }),
    )
    expect(screen.queryByTestId('guide-still-gathering')).toBeNull()
    expect(screen.getByTestId('guide-chip-accessibility')).toBeInTheDocument()
  })

  it('labels the card state-neutrally, since a returner is not a first-timer', () => {
    renderReturner()
    const card = screen.getByTestId('returner-guide-accordion')
    expect(card).toHaveTextContent(copy.returner.eyebrow)
    expect(card).not.toHaveTextContent(copy.sectionEyebrow)
  })

  it('offers a collapse control at the foot, where the reader actually ends up', () => {
    renderReturner()
    const toggle = screen.getByRole('button', {
      name: copy.returner.toggleAriaLabel,
    })
    fireEvent.click(toggle)

    const collapse = screen.getByRole('button', {
      name: copy.returner.collapseLabel,
    })
    // It must sit after the chips, or it solves nothing.
    const lastChip = screen.getByTestId('guide-chip-food_drink')
    expect(
      lastChip.compareDocumentPosition(collapse) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(collapse.style.minHeight).toBe('44px')

    fireEvent.click(collapse)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the chevron rotation under reduced motion, dropping only the transition', () => {
    renderReturner()
    const chevron = screen
      .getByRole('button', { name: copy.returner.toggleAriaLabel })
      .querySelector('svg[viewBox="0 0 12 12"]')
    expect(chevron).not.toBeNull()
    expect(chevron?.getAttribute('class')).toContain(
      'motion-reduce:transition-none',
    )
    expect(chevron?.getAttribute('class')).toContain('transition-transform')
  })
})
