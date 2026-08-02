// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}))

vi.mock('./useAuthToken', () => {
  const stableGetToken = vi.fn().mockResolvedValue(null)
  return { useAuthToken: () => stableGetToken }
})

import { useSearch } from './useSearch'

const POPULAR_RESPONSE = {
  success: true,
  data: [
    {
      id: 'ev-1',
      title: 'Show A',
      artist: 'Artist A',
      supportingArtists: null,
      tourName: null,
      date: '2027-06-01',
      ticketPriceMin: '25',
      watcherCount: 3,
      venue: { id: 'venue-1', name: 'Globe Hall', slug: 'globe-hall' },
    },
  ],
}

const EVENTS_RESPONSE = {
  success: true,
  data: {
    data: [
      {
        id: 'ev-1',
        artist: 'Radiohead',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-01',
        title: 'Radiohead Live',
        venue: { id: 'venue-rr', name: 'Red Rocks', slug: 'red-rocks' },
      },
      {
        id: 'ev-2',
        artist: 'Radiohead',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-05',
        title: 'Radiohead Night 2',
        venue: {
          id: 'venue-rr',
          name: 'Red Rocks Amphitheatre',
          slug: 'red-rocks',
        },
      },
      {
        id: 'ev-3',
        artist: 'Other Band',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-02',
        title: 'Other Show',
        venue: {
          id: 'venue-bb',
          name: 'Bluebird Theater',
          slug: 'bluebird-theater',
        },
      },
    ],
  },
}

// #1115 PR-G — artists that have their own page. A separate endpoint from the
// event-derived artist rows above, and a separate section in the results.
const ARTIST_PAGES_RESPONSE = {
  success: true,
  data: [
    {
      name: 'Radiohead',
      slug: 'radiohead',
      photoUrl: 'https://img.example/radiohead.jpg',
      upcomingShowCount: 2,
    },
  ],
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  mockPush.mockReset()

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if ((url as string).includes('/v1/search/popular')) {
      return Promise.resolve({ json: async () => POPULAR_RESPONSE } as Response)
    }
    if ((url as string).includes('/v1/search/artists')) {
      return Promise.resolve({
        json: async () => ARTIST_PAGES_RESPONSE,
      } as Response)
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

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('search=rad'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
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

  it('deduplicates venues by venue id even when name variants differ', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('Red Rocks')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    // venue-rr appears twice with slightly different names; should collapse to one
    const redRocksResults = result.current.venueResults.filter(
      (venue) => venue.slug === 'red-rocks',
    )
    expect(redRocksResults).toHaveLength(1)
  })

  it('sets venueFirst when query strongly matches a venue name', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('Red Rocks')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(result.current.venueFirst).toBe(true)
  })

  it('does not set venueFirst when query matches artists but not venue names', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('Radiohead')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(result.current.venueFirst).toBe(false)
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

describe('useSearch — artist pages (#1115 PR-G)', () => {
  it('fetches artist pages after the debounce', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radio')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/search/artists?q=radio'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(result.current.artistPageResults).toHaveLength(1)
    expect(result.current.artistPageResults[0]?.slug).toBe('radiohead')
    expect(result.current.artistPageResults[0]?.upcomingShowCount).toBe(2)
  })

  it('drops the previous query results when the new artist lookup fails', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radio')
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.artistPageResults).toHaveLength(1)

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/v1/search/artists')) {
        return Promise.reject(new Error('artist lookup failed'))
      }
      return Promise.resolve({ json: async () => EVENTS_RESPONSE } as Response)
    })

    act(() => {
      result.current.setQuery('bluebird')
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.artistPageResults).toHaveLength(0)
  })

  it('does not query artist pages below the two-character floor', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('r')
    })

    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/search/artists'),
      expect.anything(),
    )
    expect(result.current.artistPageResults).toEqual([])
  })

  it('clears artist pages when the query is cleared', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radio')
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      result.current.clearQuery()
    })

    expect(result.current.artistPageResults).toEqual([])
  })

  it('navigates to the artist page, not a filtered browse query', () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('radiohead')
    })
    act(() => {
      result.current.navigateTo('artistPage', { slug: 'radiohead' })
    })

    expect(mockPush).toHaveBeenCalledWith('/artists/radiohead')
  })
})
