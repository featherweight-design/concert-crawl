// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BackToTodayControl } from './BackToTodayControl'

// jest-dom matchers are not loaded globally in this file, so these tests read
// raw DOM properties (getAttribute, className) instead of jest-dom helpers
// like toHaveAttribute.

describe('BackToTodayControl', () => {
  it('renders a button with the spoken date in its aria-label', () => {
    render(
      <BackToTodayControl todaySpoken="Tuesday, Apr 28" onClick={() => {}} />,
    )
    const button = screen.getByRole('button', {
      name: 'Back to today, Tuesday, Apr 28',
    })
    expect(button.getAttribute('type')).toBe('button')
  })

  it('fires onClick when pressed', () => {
    const onClick = vi.fn()
    render(
      <BackToTodayControl todaySpoken="Tuesday, Apr 28" onClick={onClick} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Back to today/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the collapsible label text carrying the icon-only collapse class', () => {
    render(
      <BackToTodayControl todaySpoken="Tuesday, Apr 28" onClick={() => {}} />,
    )
    const label = screen.getByText('Today')
    expect(label.className).toContain('b2t-label')
  })
})
