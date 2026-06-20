// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

import { WatchingItem } from './WatchingItem'
import { EventImage } from '../event-image/EventImage'

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
  sourceKind: 'primary',
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: new Date().toISOString(),
  imageUrl: 'https://venue.com/shows/radiohead.jpg',
}

describe('WatchingItem thumbnail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders EventImage in the thumbnail slot', () => {
    const { getByTestId } = render(
      <WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />,
    )

    expect(getByTestId('event-image')).toBeTruthy()
  })

  it('renders correctly even when imageUrl is null', () => {
    const show = { ...baseShow, imageUrl: null }
    const { getByTestId } = render(
      <WatchingItem show={show} density="cozy" onRemove={() => {}} />,
    )

    expect(getByTestId('event-image')).toBeTruthy()
  })

  it('passes artist name and imageUrl to EventImage', () => {
    render(<WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />)

    expect(vi.mocked(EventImage)).toHaveBeenCalledWith(
      expect.objectContaining({
        artist: baseShow.artist,
        src: baseShow.imageUrl,
      }),
      undefined,
    )
  })
})
