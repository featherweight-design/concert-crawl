// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekStripHeader } from './WeekStripHeader'

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo (memory:feedback_no_type_casting bans `as` casts), so these tests read
// raw DOM properties instead of jest-dom helpers like toHaveAttribute.

function setup(overrides: Record<string, unknown> = {}) {
  const onPick = vi.fn()
  render(
    <WeekStripHeader
      monthLabel="April 2026"
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={new Map([['2026-04-28', 2]])}
      onPick={onPick}
      prevWeekHref={null}
      nextWeekHref="/events?view=cal&weekOffset=1"
      {...overrides}
    />,
  )
  return { onPick }
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

  it('disables the previous-week chevron at the current week', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Next week' })).toBeTruthy()
    // prevWeekHref null → rendered as a disabled span, not a link.
    expect(screen.queryByRole('link', { name: 'Previous week' })).toBeNull()
  })
})
