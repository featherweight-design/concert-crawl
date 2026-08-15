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
    expect(container.querySelector('img')?.getAttribute('src')).toBe(portrait)
  })

  it('keeps event artwork ahead of the portrait', () => {
    const artwork = 'https://example.test/venue.jpg'
    const { container } = render(
      <HeroEventCard
        event={{ ...baseEvent, imageUrl: artwork, artistPhotoUrl: portrait }}
      />,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toBe(artwork)
  })
})

describe('HeroEventCard — band layout (#1525 PR 4)', () => {
  const slot = (root: HTMLElement) => {
    // Panel marks the slot aria-hidden because it repeats the artist name the
    // type column already carries — an inherent property, not a DOM position.
    const found = root.querySelector('a span[aria-hidden="true"]')
    if (!(found instanceof HTMLElement)) {
      throw new Error('the card rendered no image slot')
    }
    return found
  }

  it('renders a 112px square panel, not a wide banner', () => {
    const { container } = render(<HeroEventCard event={baseEvent} />)
    expect(slot(container).style.width).toBe('112px')
    expect(slot(container).style.height).toBe('112px')
  })

  it('has nothing that can outrun the card at 320px', () => {
    const { container } = render(<HeroEventCard event={baseEvent} />)
    // The panel is the only fixed-width child, so the type column must be
    // free to shrink or the band overflows on the 320px baseline.
    const column = slot(container).nextElementSibling
    expect(column?.className).toContain('min-w-0')
    expect(column?.className).toContain('flex-1')
  })

  it('keeps the watch button outside the link', () => {
    const { container } = render(<HeroEventCard event={baseEvent} />)
    const watch = screen.getByTestId('watch-stub')
    expect(container.querySelector('a')?.contains(watch)).toBe(false)
  })

  it('puts the eyebrow badge in the type column', () => {
    const { container } = render(<HeroEventCard event={baseEvent} />)
    const badge = screen.getByText(/★/)
    expect(slot(container).nextElementSibling?.contains(badge)).toBe(true)
  })
})
