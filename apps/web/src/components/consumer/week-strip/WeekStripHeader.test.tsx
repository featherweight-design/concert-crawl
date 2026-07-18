// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekStripHeader } from './WeekStripHeader'

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo (memory:feedback_no_type_casting bans `as` casts), so these tests read
// raw DOM properties instead of jest-dom helpers like toHaveAttribute.

function setup(overrides: Record<string, unknown> = {}) {
  const onPick = vi.fn()
  const onBackToToday = vi.fn()
  render(
    <WeekStripHeader
      monthLabel="April 2026"
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={new Map([['2026-04-28', 2]])}
      onPick={onPick}
      prevWeekHref={null}
      nextWeekHref="/events?view=cal&weekOffset=1"
      showBackToToday={false}
      onBackToToday={onBackToToday}
      {...overrides}
    />,
  )
  return { onPick, onBackToToday }
}

describe('WeekStripHeader', () => {
  it('shows the month cue with a dialog affordance', () => {
    setup()
    const cue = screen.getByRole('button', {
      name: /April 2026\. Jump to a date/,
    })
    expect(cue.getAttribute('aria-haspopup')).toBe('dialog')
    expect(cue.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens the picker on cue click', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Jump to a date/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('toggles the picker closed when the cue is clicked again', () => {
    setup()
    const cue = screen.getByRole('button', { name: /Jump to a date/ })
    fireEvent.click(cue)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(cue)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the picker when the click-catcher scrim is clicked', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Jump to a date/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    const catcher = document.querySelector('.cjp-catch')
    expect(catcher).toBeTruthy()
    fireEvent.click(catcher!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('restores focus to the cue after picking a day', () => {
    const { onPick } = setup()
    const cue = screen.getByRole('button', { name: /Jump to a date/ })
    fireEvent.click(cue)
    // Today (2026-04-28) is a selectable in-window day in the open grid.
    const day = screen.getByRole('gridcell', { name: /April 28/ })
    fireEvent.click(day)
    expect(onPick).toHaveBeenCalledWith('2026-04-28')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(cue)
  })

  it('disables the previous-week chevron at the current week', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Next week' })).toBeTruthy()
    // prevWeekHref null → rendered as a disabled span, not a link.
    expect(screen.queryByRole('link', { name: 'Previous week' })).toBeNull()
  })

  it('hides the back-to-today control when showBackToToday is false', () => {
    setup({ showBackToToday: false })
    expect(screen.queryByRole('button', { name: /Back to today/ })).toBeNull()
  })

  it('shows the back-to-today control and fires onBackToToday when true', () => {
    const { onBackToToday } = setup({ showBackToToday: true })
    const button = screen.getByRole('button', { name: /Back to today/ })
    fireEvent.click(button)
    expect(onBackToToday).toHaveBeenCalledTimes(1)
  })
})
