// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { EventWithVenue } from '@concert-crawl/types'
import { CalendarView } from './CalendarView'

// Repo convention (memory:feedback_no_type_casting): no @testing-library/jest-dom
// matchers, no user-event. Drive with fireEvent + raw DOM reads.
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  // Both read by the nested WatchShowButton to build its signed-out sign-up
  // link, which carries the current view — query included — through auth.
  usePathname: () => '/events',
  useSearchParams: () => new URLSearchParams(),
}))
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

function makeEvent(overrides: Partial<EventWithVenue>): EventWithVenue {
  return {
    id: 'evt-1',
    venueId: 'venue-1',
    title: 'Test Show',
    artist: 'Test Artist',
    supportingArtists: null,
    tourName: null,
    date: '2026-05-11',
    doorsTime: null,
    showTime: '20:00:00',
    ticketUrl: null,
    eventUrl: null,
    ticketLinks: null,
    ticketPriceMin: '25',
    ticketPriceMax: '25',
    priceSource: 'community',
    pipelineExhaustedAt: null,
    description: null,
    imageUrl: null,
    genre: ['rock'],
    status: 'upcoming',
    confidenceScore: null,
    verified: false,
    sourceUrl: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    venue: {
      id: 'venue-1',
      name: 'Test Venue',
      slug: 'test-venue',
      city: 'Denver',
      timezone: 'America/Denver',
      websiteUrl: 'https://example.com',
    },
    priceVendor: null,
    ...overrides,
  }
}

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
    // EventCard → WatchShowButton reads window.matchMedia, absent in jsdom.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
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

  it('tracks a new initialSelectedDate after a cross-week router.push re-render', () => {
    // A cross-week jump soft-navigates via router.push; Next.js re-renders this
    // client component with a fresh initialSelectedDate + the new week's events,
    // but React does NOT re-run useState's initializer. Without syncing state to
    // the prop, filteredEvents keeps filtering the new week by the stale date and
    // renders "Nothing on this day". This asserts the selection tracks the prop.
    const mayWeek = [
      { date: '2026-05-11', label: 'MON', dayOfMonth: '11', hasEvents: true },
      { date: '2026-05-12', label: 'TUE', dayOfMonth: '12', hasEvents: false },
      { date: '2026-05-13', label: 'WED', dayOfMonth: '13', hasEvents: false },
      { date: '2026-05-14', label: 'THU', dayOfMonth: '14', hasEvents: false },
      { date: '2026-05-15', label: 'FRI', dayOfMonth: '15', hasEvents: false },
      { date: '2026-05-16', label: 'SAT', dayOfMonth: '16', hasEvents: false },
      { date: '2026-05-17', label: 'SUN', dayOfMonth: '17', hasEvents: false },
    ]
    const mayEvent = makeEvent({
      id: 'evt-may-11',
      artist: 'Cross Week Headliner',
      date: '2026-05-11',
    })
    const { rerender } = render(
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
    // Simulate the post-navigation server props: new week, new selected date.
    rerender(
      <CalendarView
        days={mayWeek}
        events={[mayEvent]}
        initialSelectedDate="2026-05-11"
        today="2026-04-28"
        watchedIds={[]}
        prevWeekHref="/events?view=cal"
        nextWeekHref="/events?view=cal&weekOffset=3"
        initialAvailability={{
          data: [{ date: '2026-05-11', count: 3 }],
          from: '2026-04-01',
          to: '2027-04-30',
        }}
      />,
    )
    expect(screen.getByText('Cross Week Headliner')).toBeTruthy()
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
