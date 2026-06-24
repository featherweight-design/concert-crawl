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

import { EventCard } from './EventCard'

afterEach(() => {
  cleanup()
})

const baseEvent: EventWithVenue = {
  id: 'evt-1',
  venueId: 'venue-1',
  title: 'Test Show',
  artist: 'Test Artist',
  date: '2026-07-01',
  doorsTime: null,
  showTime: '20:00:00',
  ticketUrl: null,
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

describe('EventCard — browse chip parity (MTListChip)', () => {
  it("community + VenueBoxOffice vendor → MTListChip with kind='boxoffice' (star glyph)", () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'community',
          priceVendor: 'VenueBoxOffice',
        }}
      />,
    )
    // MTListChip renders "$25" (from=false)
    const priceText = screen.getByText('$25') as HTMLElement
    expect(priceText).toBeDefined()
    // boxoffice kind renders a star svg inside the chip — locate via parent chip
    const chip = priceText.parentElement as HTMLElement
    expect(chip.querySelector('svg')).not.toBeNull()
    // No resale tag for boxoffice
    expect(screen.queryByText('resale')).toBeNull()
  })

  it("community + non-VenueBoxOffice vendor → MTListChip with kind='community' (no glyph, no tag)", () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'community',
          priceVendor: 'Ticketmaster',
        }}
      />,
    )
    const priceText = screen.getByText('$25') as HTMLElement
    expect(priceText).toBeDefined()
    // community has no glyph — scoped to the chip
    const chip = priceText.parentElement as HTMLElement
    expect(chip.querySelector('svg')).toBeNull()
    expect(screen.queryByText('resale')).toBeNull()
  })

  it("priceSource=seatgeek → MTListChip with kind='resale' (always-present resale tag)", () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'seatgeek',
          priceVendor: null,
        }}
      />,
    )
    expect(screen.getByText('$25')).toBeDefined()
    expect(screen.getByText('resale')).toBeDefined()
  })

  it('priceSource=ticketmaster (primary) → MTListChip with kind=null (no special chip styling)', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'ticketmaster',
          priceVendor: null,
        }}
      />,
    )
    const priceText = screen.getByText('$25') as HTMLElement
    expect(priceText).toBeDefined()
    const chip = priceText.parentElement as HTMLElement
    expect(chip.querySelector('svg')).toBeNull()
    expect(screen.queryByText('resale')).toBeNull()
  })

  it('cancelled status → no price chip rendered', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          status: 'cancelled',
        }}
      />,
    )
    expect(screen.queryByText('$25')).toBeNull()
    expect(screen.queryByText('tba')).toBeNull()
  })

  it('postponed status → no price chip rendered', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          status: 'postponed',
        }}
      />,
    )
    expect(screen.queryByText('$25')).toBeNull()
    expect(screen.queryByText('tba')).toBeNull()
  })

  it('null ticketPriceMin → "tba" fallback rendered', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          ticketPriceMin: null,
        }}
      />,
    )
    expect(screen.queryByText('$25')).toBeNull()
    expect(screen.getByText('tba')).toBeDefined()
  })

  it('from={false} parity — chip renders bare "$25", never "from $25"', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'community',
          priceVendor: 'VenueBoxOffice',
        }}
      />,
    )
    expect(screen.getByText('$25')).toBeDefined()
    expect(screen.queryByText('from $25')).toBeNull()
  })
})
