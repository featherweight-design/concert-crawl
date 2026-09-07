// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import type { WatchingShow } from '@concert-crawl/types'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}))

vi.mock('../event-image/EventImage', () => ({
  EventImage: vi.fn(() => <div data-testid="event-image" />),
}))

// The nudge's "Yes, going" fires a real mutation. Stubbing the hook keeps the
// row renderable without a QueryClientProvider and lets the call be asserted.
// The default stub resolves, so tests opt in to the failure path.
type MutateOptions = { onSuccess?: () => void; onError?: () => void }
const succeeds = (_input: unknown, options?: MutateOptions) =>
  options?.onSuccess?.()
const fails = (_input: unknown, options?: MutateOptions) => options?.onError?.()
const attendingMutate = vi.fn(succeeds)
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutate: attendingMutate }),
}))

import { WatchingRow } from './WatchingRow'
import { EventImage } from '../event-image/EventImage'
import { GOING_COPY } from '@/components/consumer/going/definitions/copy'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const WATCHING_COPY = CONSUMER_COPY.watching

const baseShow: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
  ticketLinks: null,
  savedAt: new Date().toISOString(),
  savedPrice: 45,
  currentPrice: 45,
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: new Date().toISOString(),
  priceObservedAt: null,
  imageUrl: 'https://venue.com/shows/radiohead.jpg',
  artistPhotoUrl: null,
  attendingAt: null,
}

describe('WatchingRow remove control', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports the watch row id, not the event id', () => {
    const onRemove = vi.fn()
    render(<WatchingRow show={baseShow} onRemove={onRemove} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: WATCHING_COPY.watchingItem.removeAriaLabel(baseShow.artist),
      }),
    )
    expect(onRemove).toHaveBeenCalledWith(baseShow.userEventId)
  })
})

describe('WatchingRow thumbnail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders EventImage in the thumbnail slot', () => {
    const { getByTestId } = render(
      <WatchingRow show={baseShow} onRemove={() => {}} />,
    )

    expect(getByTestId('event-image')).toBeTruthy()
  })

  it('renders correctly even when imageUrl is null', () => {
    const show = { ...baseShow, imageUrl: null }
    const { getByTestId } = render(
      <WatchingRow show={show} onRemove={() => {}} />,
    )

    expect(getByTestId('event-image')).toBeTruthy()
  })

  it('passes artist name and imageUrl to EventImage', () => {
    render(<WatchingRow show={baseShow} onRemove={() => {}} />)

    expect(vi.mocked(EventImage)).toHaveBeenCalledWith(
      expect.objectContaining({
        artist: baseShow.artist,
        src: baseShow.imageUrl,
      }),
      undefined,
    )
  })
})

// Two days out in UTC is inside the 0-7 day Mountain-Time window regardless of
// which side of midnight the offset lands on.
const soonShow: WatchingShow = {
  ...baseShow,
  date: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
}

const nudge = () => screen.queryByText(GOING_COPY.nudge.heading)

describe('WatchingRow "Still going?" nudge', () => {
  beforeEach(() => {
    localStorage.clear()
    attendingMutate.mockReset()
    attendingMutate.mockImplementation(succeeds)
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('asks about a show inside the window', () => {
    render(<WatchingRow show={soonShow} onRemove={() => {}} />)
    expect(nudge()).not.toBeNull()
  })

  // The optimistic row's id is a placeholder, so an answer keyed to it would be
  // dropped the instant the server's real id arrived.
  it('stays quiet while the watch row is still optimistic', () => {
    render(
      <WatchingRow
        show={{ ...soonShow, userEventId: 'optimistic-ev-1' }}
        onRemove={() => {}}
      />,
    )
    expect(nudge()).toBeNull()
  })

  it('stays quiet for a show months out', () => {
    render(<WatchingRow show={baseShow} onRemove={() => {}} />)
    expect(nudge()).toBeNull()
  })

  it('stays quiet once the user has already committed', () => {
    render(
      <WatchingRow
        show={{ ...soonShow, attendingAt: new Date().toISOString() }}
        onRemove={() => {}}
      />,
    )
    expect(nudge()).toBeNull()
  })

  it('marks attendance and closes when the user says yes', () => {
    render(<WatchingRow show={soonShow} onRemove={() => {}} />)
    fireEvent.click(screen.getByText(GOING_COPY.nudge.yes))

    expect(attendingMutate).toHaveBeenCalledWith(
      { eventId: soonShow.eventId, going: true },
      expect.anything(),
    )
    expect(nudge()).toBeNull()
  })

  it('re-asks when the commitment fails, rather than sticking answered', () => {
    attendingMutate.mockImplementation(fails)
    render(<WatchingRow show={soonShow} onRemove={() => {}} />)
    fireEvent.click(screen.getByText(GOING_COPY.nudge.yes))

    // The optimistic cache update rolls back, so a silently-dismissed banner
    // would leave the user no way to retry from Watching.
    expect(nudge()).not.toBeNull()
    expect(localStorage.getItem('cc-nudge-answered')).toBeNull()
  })

  it('does not ask again after any answer', () => {
    for (const label of [GOING_COPY.nudge.yes, GOING_COPY.nudge.dismiss]) {
      localStorage.clear()
      render(<WatchingRow show={soonShow} onRemove={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: label }))
      cleanup()

      // A remount re-reads the per-device record, so the banner must not return.
      render(<WatchingRow show={soonShow} onRemove={() => {}} />)
      expect(nudge()).toBeNull()
      cleanup()
    }
  })
})

// #1366 — staleness used to be computed from the event row's updatedAt, so a
// price that Event Detail (which reads the price timestamp) called fresh could
// be flagged stale here, and vice versa.
describe('WatchingRow staleness', () => {
  const daysAgo = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  it('ages the price off its own observation time, not the event row', () => {
    const { getByTestId } = render(
      <WatchingRow
        show={{
          ...baseShow,
          updatedAt: new Date().toISOString(),
          priceObservedAt: daysAgo(8),
        }}
        onRemove={() => {}}
      />,
    )

    expect(getByTestId('row-meta').textContent).toContain('Stale · 8d ago')
  })

  it('leaves a freshly observed price unflagged even on an old event row', () => {
    const { queryByTestId } = render(
      <WatchingRow
        show={{
          ...baseShow,
          updatedAt: daysAgo(30),
          priceObservedAt: new Date().toISOString(),
        }}
        onRemove={() => {}}
      />,
    )

    expect(queryByTestId('row-meta')?.textContent ?? '').not.toContain('Stale')
  })

  // Crawler prices carry no submission timestamp; the last crawl is what last
  // confirmed the number, so updatedAt stays the fallback.
  it('falls back to the event row when the price has no observation time', () => {
    const { getByTestId } = render(
      <WatchingRow
        show={{ ...baseShow, updatedAt: daysAgo(3), priceObservedAt: null }}
        onRemove={() => {}}
      />,
    )

    expect(getByTestId('row-meta').textContent).toContain('Stale · 3d ago')
  })
})
