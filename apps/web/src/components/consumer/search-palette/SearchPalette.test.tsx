// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

// Base hook state — mutable so individual tests can override query
const mockHookState = {
  query: 'radio',
  setQuery: vi.fn(),
  clearQuery: vi.fn(),
  recentSearches: [],
  popularEvents: [],
  artistResults: [
    { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    { name: 'Godspeed', nextDate: '2027-06-05', venueShort: 'Bluebird' },
  ],
  venueResults: [
    {
      name: 'Red Rocks',
      slug: 'red-rocks',
      showCount: 3,
      matchingEventId: 'ev-1',
    },
  ],
  venueFirst: false,
  isLoading: false,
  navigateTo: mockNavigateTo,
}

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => mockHookState,
}))

import { SearchPalette } from './SearchPalette'

const onClose = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // Reset to non-empty query so SearchResultsState renders by default
  mockHookState.query = 'radio'
  mockHookState.artistResults = [
    { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    { name: 'Godspeed', nextDate: '2027-06-05', venueShort: 'Bluebird' },
  ]
  mockHookState.venueResults = [
    {
      name: 'Red Rocks',
      slug: 'red-rocks',
      showCount: 3,
      matchingEventId: 'ev-1',
    },
  ]
  mockHookState.venueFirst = false
})

describe('SearchPalette', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SearchPalette open={false} onClose={onClose} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the palette when open', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    expect(
      screen.getByPlaceholderText('Search artists or venues…'),
    ).toBeTruthy()
  })

  it('calls onClose when Escape is pressed', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <SearchPalette open={true} onClose={onClose} />,
    )
    // The backdrop is the outermost div
    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when palette body is clicked', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.click(screen.getByPlaceholderText('Search artists or venues…'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('highlights the first result after one ArrowDown', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // idx 0 = Radiohead (first artist)
    const buttons = screen.getAllByRole('button', { name: /Radiohead/i })
    // The matching button should have data-selected="true"
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    )
    expect(selected).toBeTruthy()
  })

  it('highlights the second result after two ArrowDowns', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // idx 1 = Godspeed (second artist)
    const buttons = screen.getAllByRole('button', { name: /Godspeed/i })
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    )
    expect(selected).toBeTruthy()
  })

  it('de-highlights all rows at idx -1 (before any navigation)', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    // No ArrowDown pressed — nothing should be selected
    const selectedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('data-selected') === 'true')
    expect(selectedButtons).toHaveLength(0)
  })

  it('moves highlight back up with ArrowUp', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // idx 0
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // idx 1
    fireEvent.keyDown(window, { key: 'ArrowUp' }) // back to idx 0
    const buttons = screen.getAllByRole('button', { name: /Radiohead/i })
    const selected = buttons.find(
      (btn) => btn.getAttribute('data-selected') === 'true',
    )
    expect(selected).toBeTruthy()
  })

  it('navigates with ArrowDown + Enter on artist result', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // select idx 0 = Radiohead
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates with ArrowDown x3 + Enter to select venue result', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    // 2 artists + 1 venue. ArrowDown x3 → idx 2 = Red Rocks venue
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'red-rocks',
      matchingEventId: 'ev-1',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not navigate when Enter is pressed with no selection', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('clamps ArrowDown at the last result', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    // 3 total results, pressing down 10 times should clamp to idx 2
    for (let times = 0; times < 10; times++) {
      fireEvent.keyDown(window, { key: 'ArrowDown' })
    }
    fireEvent.keyDown(window, { key: 'Enter' })
    // Should navigate to the last result (Red Rocks venue at idx 2)
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'red-rocks',
      matchingEventId: 'ev-1',
    })
  })
})
