// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import type { WatchingShow } from '@concert-crawl/types'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}))

import { WatchingItem } from './WatchingItem'

const baseShow: WatchingShow = {
  userEventId: 'ue-1',
  eventId: 'ev-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
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
  it('renders IdentityArt SVG, not a venue img element', () => {
    const { container } = render(
      <WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />,
    )

    // Should render an SVG (IdentityArt) in the thumbnail slot
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)

    // Should NOT render an img element with the venue imageUrl
    const imgEl = container.querySelector(`img[src="${baseShow.imageUrl}"]`)
    expect(imgEl).toBeNull()
  })

  it('renders correctly even when imageUrl is null', () => {
    const show = { ...baseShow, imageUrl: null }
    const { container } = render(
      <WatchingItem show={show} density="cozy" onRemove={() => {}} />,
    )

    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('uses the artist name as the IdentityArt seed', () => {
    const { getByLabelText } = render(
      <WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />,
    )

    // IdentityArt receives aria-label={show.artist}
    expect(getByLabelText('Radiohead')).toBeTruthy()
  })
})
