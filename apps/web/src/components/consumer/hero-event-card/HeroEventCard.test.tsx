// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { EventWithVenue } from '@concert-crawl/types'

// Stub the WatchShowButton because it pulls Clerk + React Query hooks that
// require a runtime context the bare jsdom render doesn't have.
vi.mock('../watch-show-button', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}))

// Stub next/link so we don't need the App Router context.
vi.mock('next/link', () => ({
  __esModule: true,
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

import { HeroEventCard } from './HeroEventCard'

afterEach(() => {
  cleanup()
})

const baseEvent: EventWithVenue = {
  id: 'evt-1',
  venueId: 'venue-1',
  title: 'Test Show',
  artist: 'Test Artist',
  supportingArtists: null,
  tourName: null,
  date: '2026-07-01',
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
}

describe('HeroEventCard — eyebrow badge slot (#763 PR 6)', () => {
  it('renders the accent label badge by default', () => {
    render(<HeroEventCard event={baseEvent} />)
    // Default label is the "Tonight's pick" style eyebrow with the ★ prefix.
    expect(screen.getByText(/★/)).toBeDefined()
    expect(screen.queryByText('Following')).toBeNull()
  })

  it('swaps in the Following badge when followedArtists matches', () => {
    render(
      <HeroEventCard
        event={{ ...baseEvent, followedArtists: ['Test Artist'] }}
      />,
    )
    expect(screen.getByText('Following')).toBeDefined()
    expect(screen.getByText('You follow this artist on Spotify')).toBeDefined()
    // The accent eyebrow is fully replaced, not stacked.
    expect(screen.queryByText(/★/)).toBeNull()
  })

  it('keeps the accent badge for an empty followedArtists array', () => {
    render(<HeroEventCard event={{ ...baseEvent, followedArtists: [] }} />)
    expect(screen.getByText(/★/)).toBeDefined()
    expect(screen.queryByText('Following')).toBeNull()
  })
})

describe('HeroEventCard — imagery chain (#1525)', () => {
  const portrait = 'https://example.test/artist.jpg'

  it('shows the headliner portrait when the event has no artwork', () => {
    const { container } = render(
      <HeroEventCard
        event={{ ...baseEvent, imageUrl: null, artistPhotoUrl: portrait }}
      />,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      encodeURIComponent(portrait),
    )
  })

  it('keeps event artwork ahead of the portrait', () => {
    const artwork = 'https://example.test/venue.jpg'
    const { container } = render(
      <HeroEventCard
        event={{ ...baseEvent, imageUrl: artwork, artistPhotoUrl: portrait }}
      />,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      encodeURIComponent(artwork),
    )
  })
})
