// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { CalendarView } from './CalendarView'

// Repo convention (memory:feedback_no_type_casting): no @testing-library/jest-dom
// matchers, no user-event. Drive with fireEvent + raw DOM reads.
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null }),
}))

// Full current week: Mon 2026-04-27 .. Sun 2026-05-03 so in-week vs out-of-week
// branching is exercised. weekOffsetForDate('2026-05-11','2026-04-28') === 2.
const days = [
  { date: '2026-04-27', label: 'MON', dayOfMonth: '27', hasEvents: false },
  { date: '2026-04-28', label: 'TUE', dayOfMonth: '28', hasEvents: true },
  { date: '2026-04-29', label: 'WED', dayOfMonth: '29', hasEvents: false },
  { date: '2026-04-30', label: 'THU', dayOfMonth: '30', hasEvents: false },
  { date: '2026-05-01', label: 'FRI', dayOfMonth: '1', hasEvents: false },
  { date: '2026-05-02', label: 'SAT', dayOfMonth: '2', hasEvents: false },
  { date: '2026-05-03', label: 'SUN', dayOfMonth: '3', hasEvents: false },
]

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setup() {
  render(
    <CalendarView
      days={days}
      events={[]}
      initialSelectedDate="2026-04-28"
      today="2026-04-28"
      watchedIds={[]}
      prevWeekHref={null}
      nextWeekHref="/events?view=cal&weekOffset=1"
      initialAvailability={{
        data: [{ date: '2026-05-11', count: 3 }],
        from: '2026-04-01',
        to: '2027-04-30',
      }}
    />,
    { wrapper },
  )
}

describe('CalendarView jump navigation', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('router.pushes with weekOffset when jumping outside the current week', () => {
    setup()
    // Open the picker via the month cue.
    fireEvent.click(screen.getByRole('button', { name: /Jump to a date/ }))
    // Page forward from April to May so 2026-05-11 is in-month + selectable.
    fireEvent.click(screen.getByLabelText('Next month'))
    fireEvent.click(screen.getByRole('gridcell', { name: /Monday, May 11/ }))
    expect(push).toHaveBeenCalledTimes(1)
    const url = push.mock.calls[0]?.[0]
    expect(url).toContain('weekOffset=2')
    expect(url).toContain('selectedDate=2026-05-11')
  })

  it('updates the cue month label on an in-week pick that crosses months', () => {
    setup()
    // Cue starts on the initial selection (Apr 28).
    expect(
      screen.getByRole('button', { name: /April 2026\. Jump to a date/ }),
    ).toBeTruthy()
    // Fri May 1 is in the rendered week (Apr 27 – May 3) → in-week, no nav.
    fireEvent.click(screen.getByRole('button', { name: /Friday, May 1/ }))
    expect(push).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: /May 2026\. Jump to a date/ }),
    ).toBeTruthy()
  })
})
