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

vi.mock('../identity-art/IdentityArt', () => ({
  IdentityArt: vi.fn(() => <svg data-testid="identity-art" />),
}))

import { WatchingItem } from './WatchingItem'
import { IdentityArt } from '../identity-art/IdentityArt'

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
  beforeEach(() => vi.clearAllMocks())

  it('renders IdentityArt, not a venue img element', () => {
    const { getByTestId, container } = render(
      <WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />,
    )

    // IdentityArt is rendered in the thumbnail slot
    expect(getByTestId('identity-art')).toBeTruthy()

    // Should NOT render an img element with the venue imageUrl
    const imgEl = container.querySelector(`img[src="${baseShow.imageUrl}"]`)
    expect(imgEl).toBeNull()
  })

  it('renders correctly even when imageUrl is null', () => {
    const show = { ...baseShow, imageUrl: null }
    const { getByTestId } = render(
      <WatchingItem show={show} density="cozy" onRemove={() => {}} />,
    )

    expect(getByTestId('identity-art')).toBeTruthy()
  })

  it('passes the artist name as the IdentityArt name prop', () => {
    render(<WatchingItem show={baseShow} density="cozy" onRemove={() => {}} />)

    expect(vi.mocked(IdentityArt)).toHaveBeenCalledWith(
      expect.objectContaining({ name: baseShow.artist }),
      undefined,
    )
  })
})
