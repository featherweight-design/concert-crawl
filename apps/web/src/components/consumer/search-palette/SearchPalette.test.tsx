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
vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    clearQuery: vi.fn(),
    recentSearches: [],
    popularEvents: [],
    artistResults: [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
      { name: 'Godspeed', nextDate: '2027-06-05', venueShort: 'Bluebird' },
    ],
    venueResults: [{ name: 'Red Rocks', slug: 'red-rocks', showCount: 3 }],
    isLoading: false,
    navigateTo: mockNavigateTo,
  }),
}))

import { SearchPalette } from './SearchPalette'

const onClose = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
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

  it('navigates with ArrowDown + Enter on artist result', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // select idx 0 = Radiohead
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead')
  })

  it('navigates with ArrowDown x3 + Enter to select venue result', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    // 2 artists + 1 venue. ArrowDown x3 → idx 2 = Red Rocks venue
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', { slug: 'red-rocks' })
  })
})
