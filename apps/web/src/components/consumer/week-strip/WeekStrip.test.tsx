// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekStrip, type WeekStripDay } from './WeekStrip'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo, so these tests read raw DOM properties instead of jest-dom helpers.

const days: WeekStripDay[] = [
  { date: '2026-04-27', label: 'Mon', dayOfMonth: '27', hasEvents: true },
  { date: '2026-04-28', label: 'Tue', dayOfMonth: '28', hasEvents: false },
]

describe('WeekStrip accessible day names', () => {
  it('appends the shows cue to the aria-label when a day has events', () => {
    const onDateSelect = vi.fn()
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        onDateSelect={onDateSelect}
      />,
    )
    expect(
      screen.getByRole('button', {
        name: `Mon 27, ${CONSUMER_COPY.weekStripDayShows}`,
      }),
    ).toBeTruthy()
  })

  it('omits the shows cue when a day has no events', () => {
    const onDateSelect = vi.fn()
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        onDateSelect={onDateSelect}
      />,
    )
    const noShows = screen.getByRole('button', { name: 'Tue 28' })
    expect(noShows.getAttribute('aria-label')).toBe('Tue 28')
    fireEvent.click(noShows)
    expect(onDateSelect).toHaveBeenCalledWith('2026-04-28')
  })

  it('labels the link variant when onDateSelect is omitted', () => {
    render(
      <WeekStrip
        days={days}
        selectedDate="2026-04-28"
        today="2026-04-27"
        buildHref={(date) => `/events?selectedDate=${date}`}
      />,
    )
    expect(
      screen.getByRole('link', {
        name: `Mon 27, ${CONSUMER_COPY.weekStripDayShows}`,
      }),
    ).toBeTruthy()
  })
})
