// @vitest-environment jsdom

// The bug this whole row system exists to fix: the live Watching row truncated
// the *date* away, leaving "Mission Ballroom · Sat…". The date is the one unit
// that must survive every width. Locked here at both narrow breakpoints.

import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
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

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken: vi.fn() }) }))
vi.mock('../event-image/EventImage', () => ({
  EventImage: () => <div data-testid="event-image" />,
}))
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutate: vi.fn() }),
}))

import { WatchingRow } from './WatchingRow'

const LONG_VENUE = 'Mission Ballroom at the RiNo Art District'
const LONG_ARTIST = 'Godspeed You! Black Emperor and the Silver Mt. Zion'

const show: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: LONG_ARTIST,
  venueName: LONG_VENUE,
  venueSlug: 'mission-ballroom',
  date: '2099-08-15',
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
  priceObservedAt: new Date().toISOString(),
  imageUrl: null,
  attendingAt: null,
}

// jsdom lays nothing out, so every measurement the row makes is stubbed here.
// Mono at 11px advances a shade over 6px per character, which is what the
// measured strings are scaled by; the line's own box is given the width the
// meta column actually has at the viewport under test.
const CHAR = 6.2

function stubLayout(lineWidth: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const width =
        this.getAttribute('data-testid') === 'when-where'
          ? lineWidth
          : (this.textContent?.length ?? 0) * CHAR
      return {
        width,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } satisfies DOMRect
    },
  )
}

const line = () => screen.getByTestId('when-where').textContent ?? ''

describe('Watching row — line 3 never truncates the date', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // The meta column at a 320 viewport, after the card padding, the 56px art,
  // the price stack and the remove gutter have taken theirs.
  it('keeps the date at 320, dropping the venue rather than clipping it', () => {
    stubLayout(96)
    render(<WatchingRow show={show} onRemove={() => {}} />)

    expect(line()).toContain('Aug 15')
    expect(line()).not.toContain('Mission Ballroom')
  })

  // 390 is the width the live bug actually reproduced at, and the one a
  // caller-supplied `narrow` flag never covered.
  it('keeps the date at 390', () => {
    stubLayout(140)
    render(<WatchingRow show={show} onRemove={() => {}} />)

    expect(line()).toContain('Aug 15')
  })

  // The venue ellipsises long before it is dropped, so a column too narrow for
  // all three still spends what it has on the time.
  it('spends its width on the date and time before the venue', () => {
    stubLayout(140)
    render(<WatchingRow show={show} onRemove={() => {}} />)

    expect(line()).toContain('8:00 PM')
  })

  it('keeps all three units when the column is wide', () => {
    stubLayout(400)
    render(<WatchingRow show={show} onRemove={() => {}} />)

    expect(line()).toContain('Aug 15')
    expect(line()).toContain('8:00 PM')
    expect(screen.getByTestId('venue-name-link').textContent).toContain(
      'Mission Ballroom',
    )
  })
})
