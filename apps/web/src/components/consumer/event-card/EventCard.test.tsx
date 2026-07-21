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

describe('EventCard — EventTitleBlock integration', () => {
  it('renders supporting artists group when supportingArtists is provided', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          supportingArtists: ['Hotline TNT'],
          tourName: null,
        }}
      />,
    )
    // EventTitleBlock renders a role="group" element for the openers section.
    const openersGroup = document.querySelector('[role="group"]')
    expect(openersGroup).not.toBeNull()
  })

  it('title link is a neutral group wrapper — no typography leaks into the block', () => {
    render(<EventCard event={baseEvent} />)
    const titleLink = document.querySelector('a[class*="group/eventtitle"]')
    expect(titleLink).not.toBeNull()
    // The wrapper establishes the hover group but must not carry font-weight
    // (which would leak bold onto the mono lead word + tour eyebrow).
    expect(titleLink?.className).not.toContain('font-bold')
  })
})

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
    // MTListChip renders "from $25" (from=true is the spec default).
    const priceText = screen.getByText('from $25') as HTMLElement
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
    const priceText = screen.getByText('from $25') as HTMLElement
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
    expect(screen.getByText('from $25')).toBeDefined()
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
    const priceText = screen.getByText('from $25') as HTMLElement
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
    expect(screen.queryByText('from $25')).toBeNull()
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
    expect(screen.queryByText('from $25')).toBeNull()
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
    expect(screen.queryByText('from $25')).toBeNull()
    expect(screen.getByText('tba')).toBeDefined()
  })

  it('from={true} parity — chip renders "from $25" prefix on the browse chip', () => {
    render(
      <EventCard
        event={{
          ...baseEvent,
          priceSource: 'community',
          priceVendor: 'VenueBoxOffice',
        }}
      />,
    )
    expect(screen.getByText('from $25')).toBeDefined()
    expect(screen.queryByText('$25')).toBeNull()
  })

  describe('Following chip (#763 PR 6)', () => {
    it('renders the Following chip when followedArtists is non-empty', () => {
      render(
        <EventCard
          event={{ ...baseEvent, followedArtists: ['Test Artist'] }}
        />,
      )
      expect(screen.getByText('Following')).toBeDefined()
      // Genre chips still render alongside it in the shared chip row.
      expect(screen.getByText('rock')).toBeDefined()
    })

    it('omits the chip when followedArtists is an empty array', () => {
      render(<EventCard event={{ ...baseEvent, followedArtists: [] }} />)
      expect(screen.queryByText('Following')).toBeNull()
    })

    it('omits the chip when followedArtists is absent (anonymous/unconnected)', () => {
      render(<EventCard event={baseEvent} />)
      expect(screen.queryByText('Following')).toBeNull()
    })
  })

  describe('Browse #7 — priceByTier-driven chip parity (closes #787)', () => {
    it('priceByTier with boxoffice headline → boxoffice chip regardless of priceSource', () => {
      render(
        <EventCard
          event={{
            ...baseEvent,
            // priceSource intentionally mismatches the headline source to
            // assert priceByTier wins.
            priceSource: 'ticketmaster',
            priceVendor: null,
            priceByTier: [
              {
                tier: 'GA',
                headline: {
                  submissionId: 's1',
                  priceMin: '32',
                  priceMax: null,
                  vendor: 'VenueBoxOffice',
                  sourceCategory: 'boxoffice',
                  submitterHandle: 'ada',
                  observedAt: '2026-06-20T00:00:00Z',
                  approvedAt: '2026-06-20T00:00:00Z',
                  approvalKind: 'fan',
                  confirmsCount: 2,
                },
                alternates: [],
                pending: [],
                counterSubmission: null,
                reports: 0,
              },
            ],
          }}
        />,
      )
      // Picks up the priceByTier headline floor instead of ticketPriceMin.
      const priceText = screen.getByText('from $32') as HTMLElement
      expect(priceText).toBeDefined()
      // Boxoffice glyph (star SVG) renders inside the chip.
      const chip = priceText.parentElement as HTMLElement
      expect(chip.querySelector('svg')).not.toBeNull()
    })

    it('priceByTier with resale headline → coral resale chip', () => {
      render(
        <EventCard
          event={{
            ...baseEvent,
            priceSource: 'community',
            priceVendor: null,
            priceByTier: [
              {
                tier: 'GA',
                headline: {
                  submissionId: 's1',
                  priceMin: '120',
                  priceMax: null,
                  vendor: 'SeatGeek',
                  sourceCategory: 'resale',
                  submitterHandle: 'ada',
                  observedAt: '2026-06-20T00:00:00Z',
                  approvedAt: '2026-06-20T00:00:00Z',
                  approvalKind: 'fan',
                  confirmsCount: 2,
                },
                alternates: [],
                pending: [],
                counterSubmission: null,
                reports: 0,
              },
            ],
          }}
        />,
      )
      expect(screen.getByText('from $120')).toBeDefined()
      // Coral resale chip carries the "resale" tag.
      expect(screen.getByText('resale')).toBeDefined()
    })

    it('priceByTier with no headlines falls back to legacy resolveListChipKind', () => {
      render(
        <EventCard
          event={{
            ...baseEvent,
            priceSource: 'community',
            priceVendor: 'VenueBoxOffice',
            // Pending-only tier — no headline. browseHeadline returns null;
            // EventCard falls through to (priceSource, priceVendor) heuristic
            // which yields kind='boxoffice'.
            priceByTier: [
              {
                tier: 'GA',
                headline: null,
                alternates: [],
                pending: [
                  {
                    id: 'p1',
                    priceMin: '40',
                    priceMax: null,
                    vendor: 'VenueBoxOffice',
                    howFound: 'saw_listing',
                    sourceCategory: 'boxoffice',
                    note: null,
                    submitterHandle: null,
                    submittedAt: '2026-06-20T00:00:00Z',
                    confirmsCount: 0,
                    confirmsNeeded: 2,
                    isSubmitter: false,
                  },
                ],
                counterSubmission: null,
                reports: 0,
              },
            ],
          }}
        />,
      )
      // Falls back to ticketPriceMin ($25) + boxoffice kind via legacy helper.
      const priceText = screen.getByText('from $25') as HTMLElement
      expect(priceText).toBeDefined()
      const chip = priceText.parentElement as HTMLElement
      expect(chip.querySelector('svg')).not.toBeNull()
    })
  })
})
