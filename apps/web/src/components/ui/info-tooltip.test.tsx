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
  it('exposes the full explanation on the trigger and hides the tooltip until clicked', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /days away/i })
    expect(trigger.getAttribute('aria-label')).toBe(
      'Days away. Extra confirmation needed.',
    )
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('toggles open on click and marks the trigger expanded', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /days away/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('tooltip').textContent).toBe(
      'Extra confirmation needed.',
    )
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
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
