// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { InfoTooltip } from './info-tooltip'

afterEach(cleanup)

const setup = () =>
  render(
    <div>
      <InfoTooltip
        triggerLabel="Days away"
        content="Extra confirmation needed."
      >
        Days away
      </InfoTooltip>
      <button type="button">outside</button>
    </div>,
  )

describe('InfoTooltip', () => {
  it('gives the trigger a concise name and hides the tooltip until clicked', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /days away/i })
    // Concise accessible name — the explanation is a description, not the name,
    // so it isn't announced twice.
    expect(trigger.getAttribute('aria-label')).toBe('Days away')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('toggles open on click and describes the trigger via the tooltip', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /days away/i })
    fireEvent.click(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe('Extra confirmation needed.')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // aria-describedby links the trigger to the tooltip content while open.
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id)
    fireEvent.click(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes on Escape', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /days away/i }))
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes on an outside pointer press but stays open for inside presses', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /days away/i })
    fireEvent.click(trigger)
    // Pointer down inside the tooltip keeps it open.
    fireEvent.pointerDown(screen.getByRole('tooltip'))
    expect(screen.getByRole('tooltip')).toBeTruthy()
    // Pointer down elsewhere closes it.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
