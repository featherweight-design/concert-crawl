// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockSetQuery = vi.fn()
const mockClearQuery = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))
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
vi.mock('../identity-art/IdentityArt', () => ({
  IdentityArt: () => <div data-testid="identity-art" />,
}))

const baseHook = {
  query: '',
  setQuery: mockSetQuery,
  clearQuery: mockClearQuery,
  recentSearches: [],
  popularEvents: [],
  artistResults: [],
  artistPageResults: [],
  venueResults: [],
  isLoading: false,
  navigateTo: mockNavigateTo,
}

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => baseHook,
}))

import { SearchDefaultState } from './SearchDefaultState'
import { SearchResultsState } from './SearchResultsState'
import { SearchEmptyState } from './SearchEmptyState'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SearchDefaultState', () => {
  it('renders recent section when recent searches exist', () => {
    const recentSearches = ['godspeed you', 'bluebird']
    render(
      <SearchDefaultState
        recentSearches={recentSearches}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Recent')).toBeTruthy()
    expect(screen.getByText('godspeed you')).toBeTruthy()
    expect(screen.getByText('bluebird')).toBeTruthy()
  })

  it('calls onPickQuery when a recent row is tapped', () => {
    render(
      <SearchDefaultState
        recentSearches={['bluebird']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('bluebird'))
    expect(mockSetQuery).toHaveBeenCalledWith('bluebird')
  })

  it('renders popular section with event rows', () => {
    const popular = [
      {
        id: 'ev-1',
        title: 'Show A',
        artist: 'Artist A',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-01',
        ticketPriceMin: '25',
        watcherCount: 3,
        venue: { name: 'Globe Hall', slug: 'globe-hall' },
      },
    ]
    render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={popular}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Popular this week')).toBeTruthy()
    expect(screen.getByText('Artist A')).toBeTruthy()
  })
})

describe('SearchResultsState', () => {
  it('renders artist section with count', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ]
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Artists · 1')).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
  })

  it('renders venue section with count', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ]
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Venues · 1')).toBeTruthy()
    expect(screen.getByText('Bluebird Theater')).toBeTruthy()
  })

  it('calls onNavigateTo with artist on tap', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ]
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Radiohead'))
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead')
  })

  it('calls onNavigateTo with venue on tap', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ]
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Bluebird Theater'))
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'bluebird-theater',
      matchingEventId: 'evt-1',
    })
  })
})

describe('SearchEmptyState', () => {
  it('renders the query in the no-results title', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    expect(screen.getByText(/No results for "thee oh sees"/)).toBeTruthy()
  })

  it('falls back to generic title when query is empty', () => {
    render(<SearchEmptyState query="" />)
    expect(screen.getByText(/Nothing under that name/)).toBeTruthy()
  })

  it('renders browse CTA linking to /events', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    const link = screen.getByRole('link', { name: /Browse all shows/i })
    expect(link.getAttribute('href')).toBe('/events')
  })
})

describe('SearchResultsState — artist pages (#1115 PR-G)', () => {
  const ARTIST_PAGES = [
    {
      name: 'Radiohead',
      slug: 'radiohead',
      photoUrl: null,
      upcomingShowCount: 2,
      // PR 5 renders the inline Follow button off this; PR 3 only adds the
      // field to the contract.
      following: false,
    },
  ]

  it('renders the artist-pages section with its own header and count', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Artist pages · 1')).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText('2 upcoming shows')).toBeTruthy()
    expect(screen.getByText('Artist page')).toBeTruthy()
  })

  it('shows the past-shows-only label when nothing is upcoming', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={[{ ...ARTIST_PAGES[0]!, upcomingShowCount: 0 }]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Past shows only')).toBeTruthy()
  })

  it('routes an artist-page row to the page, not a filtered browse', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Radiohead'))
    expect(mockNavigateTo).toHaveBeenCalledWith('artistPage', {
      slug: 'radiohead',
    })
  })

  it('renders nothing extra when there are no artist pages', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.queryByText(/Artist pages/)).toBeNull()
  })

  it('offsets the event-derived sections so keyboard indices stay unique', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        selectedIdx={1}
        onNavigateTo={mockNavigateTo}
      />,
    )
    // Index 0 is the artist-page row; index 1 must be the event-derived row.
    const selected = document.querySelectorAll('[data-selected="true"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('Red Rocks')
  })
})
