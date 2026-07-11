// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FounderClaimTakeover } from './FounderClaimTakeover'
import { TIER_PICKER_COPY } from './definitions/copy'

const CLAIM_COPY = TIER_PICKER_COPY.founderClaim

const renderTakeover = (onDone = vi.fn()) => {
  render(
    <FounderClaimTakeover
      variant="desktop"
      seatNumber={38}
      seatsTotal={100}
      onDone={onDone}
    />,
  )
  return onDone
}

describe('FounderClaimTakeover', () => {
  it('renders the unpadded seat number and total', () => {
    renderTakeover()
    expect(screen.getByTestId('founder-claim-seat-number').textContent).toBe(
      '#38',
    )
    expect(screen.getByText(CLAIM_COPY.seatTotal(100))).toBeTruthy()
    expect(screen.getByText(CLAIM_COPY.seatCode(38, 100))).toBeTruthy()
  })

  it('renders headline, price stamp, and dialog semantics', () => {
    renderTakeover()
    expect(screen.getByText(CLAIM_COPY.headline)).toBeTruthy()
    expect(screen.getByText(CLAIM_COPY.priceStampEyebrow)).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe(CLAIM_COPY.ariaLabel)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('CTA hands control back via onDone', () => {
    const onDone = renderTakeover()
    fireEvent.click(screen.getByRole('button', { name: CLAIM_COPY.cta }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('Escape also fires onDone', () => {
    const onDone = renderTakeover()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('CTA keeps UA focus styles (no all:unset reset)', () => {
    renderTakeover()
    const cta = screen.getByRole('button', { name: CLAIM_COPY.cta })
    expect(cta.style.getPropertyValue('all')).toBe('')
  })
})
