// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { useSearch } from './useSearch'

const POPULAR_RESPONSE = {
  success: true,
  data: [
    {
      id: 'ev-1',
      title: 'Show A',
      artist: 'Artist A',
      date: '2027-06-01',
      ticketPriceMin: '25',
      watcherCount: 3,
      venue: { name: 'Globe Hall', slug: 'globe-hall' },
    },
  ],
}

const EVENTS_RESPONSE = {
  success: true,
  data: {
    data: [
      {
        artist: 'Radiohead',
        date: '2027-06-01',
        title: 'Radiohead Live',
        venue: { name: 'Red Rocks', slug: 'red-rocks' },
      },
      {
        artist: 'Radiohead',
        date: '2027-06-05',
        title: 'Radiohead Night 2',
        venue: { name: 'Red Rocks', slug: 'red-rocks' },
      },
      {
        artist: 'Other Band',
        date: '2027-06-02',
        title: 'Other Show',
        venue: { name: 'Bluebird Theater', slug: 'bluebird-theater' },
      },
    ],
  },
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  mockPush.mockReset()

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if ((url as string).includes('/v1/search/popular')) {
      return Promise.resolve({ json: async () => POPULAR_RESPONSE } as Response)
    }
    return Promise.resolve({ json: async () => EVENTS_RESPONSE } as Response)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSearch — popular events', () => {
  it('fetches popular events on mount', async () => {
    const { result } = renderHook(() => useSearch())

    await act(async () => {
      await Promise.resolve() // flush the fetch promise
    })

    expect(result.current.popularEvents).toHaveLength(1)
    expect(result.current.popularEvents[0]?.artist).toBe('Artist A')
  })
})

describe('useSearch — debounce', () => {
  it('does not fetch events before 300ms', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('rad')
    })

    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('search=rad'),
      expect.anything(),
    )
  })

  it('fetches events after 300ms debounce', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('rad')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('search=rad'))
  })

  it('derives artist results with earliest next show', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('Radiohead')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    // Radiohead appears once, deduplicated with earliest date
    const artists = result.current.artistResults.filter(
      (artist) => artist.name === 'Radiohead',
    )
    expect(artists).toHaveLength(1)
    expect(artists[0]?.nextDate).toBe('2027-06-01')
  })

  it('derives venue results with show count', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('Red Rocks')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    const redRocks = result.current.venueResults.find(
      (venue) => venue.slug === 'red-rocks',
    )
    expect(redRocks?.showCount).toBe(2) // two Radiohead nights
  })
})

describe('useSearch — clearQuery', () => {
  it('resets query and results', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('rad')
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    act(() => {
      result.current.clearQuery()
    })

    expect(result.current.query).toBe('')
    expect(result.current.artistResults).toHaveLength(0)
    expect(result.current.venueResults).toHaveLength(0)
  })
})

describe('useSearch — recent searches', () => {
  it('reads recent searches from localStorage on init', () => {
    localStorage.setItem(
      'cc_recent_searches',
      JSON.stringify(['godspeed you', 'bluebird']),
    )
    const { result } = renderHook(() => useSearch())
    expect(result.current.recentSearches).toEqual(['godspeed you', 'bluebird'])
  })

  it('persists query to localStorage on navigateTo', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radiohead')
    })
    act(() => {
      result.current.navigateTo('artist', 'Radiohead')
    })

    const stored = JSON.parse(
      localStorage.getItem('cc_recent_searches') ?? '[]',
    ) as string[]
    expect(stored[0]).toBe('radiohead')
  })

  it('evicts oldest when more than 5 recent searches', () => {
    localStorage.setItem(
      'cc_recent_searches',
      JSON.stringify(['one', 'two', 'three', 'four', 'five']),
    )
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('six')
    })
    act(() => {
      result.current.navigateTo('artist', 'Someone')
    })

    const stored = JSON.parse(
      localStorage.getItem('cc_recent_searches') ?? '[]',
    ) as string[]
    expect(stored).toHaveLength(5)
    expect(stored[0]).toBe('six')
    expect(stored).not.toContain('five')
  })
})

describe('useSearch — navigateTo', () => {
  it('navigates to events search for artist', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radiohead')
    })
    act(() => {
      result.current.navigateTo('artist', 'Radiohead')
    })

    expect(mockPush).toHaveBeenCalledWith('/events?search=Radiohead')
  })

  it('navigates to venue page for venue', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('bluebird')
    })
    act(() => {
      result.current.navigateTo('venue', { slug: 'bluebird-theater' })
    })

    expect(mockPush).toHaveBeenCalledWith('/venues/bluebird-theater')
  })
})
