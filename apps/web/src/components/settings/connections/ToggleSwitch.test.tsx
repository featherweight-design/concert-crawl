// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToggleSwitch } from './ToggleSwitch'

describe('ToggleSwitch', () => {
  it('exposes role="switch" with aria-checked and the aria-label', () => {
    render(
      <ToggleSwitch
        checked={false}
        onChange={vi.fn()}
        ariaLabel="Auto-watch"
      />,
    )
    const control = screen.getByRole('switch', { name: 'Auto-watch' })
    expect(control.getAttribute('aria-checked')).toBe('false')
  })

  it('reflects checked state and reports the inverse on click', () => {
    const onChange = vi.fn()
    render(
      <ToggleSwitch
        checked={true}
        onChange={onChange}
        ariaLabel="Auto-watch"
      />,
    )
    const control = screen.getByRole('switch', { name: 'Auto-watch' })
    expect(control.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(control)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not fire when disabled', () => {
    const onChange = vi.fn()
    render(
      <ToggleSwitch
        checked={false}
        onChange={onChange}
        ariaLabel="Auto-watch"
        disabled
      />,
    )
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-watch' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
