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
      { name: 'Bluebird Theater', slug: 'bluebird-theater', showCount: 4 },
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
      { name: 'Bluebird Theater', slug: 'bluebird-theater', showCount: 4 },
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
    })
  })
})

describe('SearchEmptyState', () => {
  it('renders "Nothing for" with the query', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    expect(screen.getByText(/Nothing for/)).toBeTruthy()
    expect(screen.getByText(/thee oh sees/)).toBeTruthy()
  })

  it('renders browse CTA linking to /events', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    const link = screen.getByRole('link', { name: /Browse all shows/i })
    expect(link.getAttribute('href')).toBe('/events')
  })
})
