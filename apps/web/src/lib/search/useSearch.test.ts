// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}));

const { stableGetToken } = vi.hoisted(() => ({
  stableGetToken: vi.fn(),
}));
vi.mock('./useAuthToken', () => ({ useAuthToken: () => stableGetToken }));

import { useSearch } from './useSearch';

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
};

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
        // A stale scalar behind a cheaper corroborated tier (#1365).
        ticketPriceMin: '95.00',
        priceByTier: [
          { headline: null },
          { headline: { priceMin: '25.00', priceMax: '30.00' } },
        ],
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
};

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
      nextShow: null,
      following: false,
      mbid: null,
      disambiguation: null,
      area: null,
      type: null,
      hasShows: true,
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mockPush.mockReset();
  stableGetToken.mockReset().mockResolvedValue(null);

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if ((url as string).includes('/v1/search/popular')) {
      return Promise.resolve({
        json: async () => POPULAR_RESPONSE,
      } as Response);
    }
    if ((url as string).includes('/v1/search/artists')) {
      return Promise.resolve({
        json: async () => ARTIST_PAGES_RESPONSE,
      } as Response);
    }
    return Promise.resolve({ json: async () => EVENTS_RESPONSE } as Response);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSearch — popular events', () => {
  it('fetches popular events on mount', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await Promise.resolve(); // flush the fetch promise
    });

    expect(result.current.popularEvents).toHaveLength(1);
    expect(result.current.popularEvents[0]?.artist).toBe('Artist A');
  });
});

describe('useSearch — debounce', () => {
  it('does not fetch events before 300ms', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('rad');
    });

    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('search=rad'),
      expect.anything(),
    );
  });

  it('fetches events after 300ms debounce', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('rad');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('search=rad'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('derives artist results with earliest next show', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Radiohead');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // Radiohead appears once, deduplicated with earliest date
    const artists = result.current.artistResults.filter(
      (artist) => artist.name === 'Radiohead',
    );
    expect(artists).toHaveLength(1);
    expect(artists[0]?.nextDate).toBe('2027-06-01');
  });

  it('prices an artist row from the cheapest tier, not the scalar', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Radiohead');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const radiohead = result.current.artistResults.find(
      (artist) => artist.name === 'Radiohead',
    );
    expect(radiohead?.ticketPriceMin).toBe('25.00');
  });

  it('derives venue results with show count', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Red Rocks');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const redRocks = result.current.venueResults.find(
      (venue) => venue.slug === 'red-rocks',
    );
    expect(redRocks?.showCount).toBe(2); // two Radiohead nights
  });

  it('deduplicates venues by venue id even when name variants differ', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Red Rocks');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // venue-rr appears twice with slightly different names; should collapse to one
    const redRocksResults = result.current.venueResults.filter(
      (venue) => venue.slug === 'red-rocks',
    );
    expect(redRocksResults).toHaveLength(1);
  });

  it('sets venueFirst when query strongly matches a venue name', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Red Rocks');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.venueFirst).toBe(true);
  });

  it('does not set venueFirst when query matches artists but not venue names', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('Radiohead');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.venueFirst).toBe(false);
  });
});

describe('useSearch — clearQuery', () => {
  it('resets query and results', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('rad');
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    act(() => {
      result.current.clearQuery();
    });

    expect(result.current.query).toBe('');
    expect(result.current.artistResults).toHaveLength(0);
    expect(result.current.venueResults).toHaveLength(0);
  });
});

describe('useSearch — recent searches', () => {
  it('reads recent searches from localStorage on init', () => {
    localStorage.setItem(
      'cc_recent_searches',
      JSON.stringify(['godspeed you', 'bluebird']),
    );
    const { result } = renderHook(() => useSearch());
    expect(result.current.recentSearches).toEqual(['godspeed you', 'bluebird']);
  });

  it('persists query to localStorage on navigateTo', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radiohead');
    });
    act(() => {
      result.current.navigateTo('artist', 'Radiohead');
    });

    const stored = JSON.parse(
      localStorage.getItem('cc_recent_searches') ?? '[]',
    ) as string[];
    expect(stored[0]).toBe('radiohead');
  });

  it('evicts oldest when more than 5 recent searches', () => {
    localStorage.setItem(
      'cc_recent_searches',
      JSON.stringify(['one', 'two', 'three', 'four', 'five']),
    );
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('six');
    });
    act(() => {
      result.current.navigateTo('artist', 'Someone');
    });

    const stored = JSON.parse(
      localStorage.getItem('cc_recent_searches') ?? '[]',
    ) as string[];
    expect(stored).toHaveLength(5);
    expect(stored[0]).toBe('six');
    expect(stored).not.toContain('five');
  });
});

describe('useSearch — navigateTo', () => {
  it('navigates to events search for artist', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radiohead');
    });
    act(() => {
      result.current.navigateTo('artist', 'Radiohead');
    });

    expect(mockPush).toHaveBeenCalledWith('/events?search=Radiohead');
  });

  it('navigates to venue page for venue', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('bluebird');
    });
    act(() => {
      result.current.navigateTo('venue', { slug: 'bluebird-theater' });
    });

    expect(mockPush).toHaveBeenCalledWith('/venues/bluebird-theater');
  });
});

const flush = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300);
    for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
  });
};

describe('useSearch — artist list (scope=all)', () => {
  it('fetches the artist list with scope=all after the debounce', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/search/artists?q=radio&scope=all'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.artistList).toHaveLength(1);
    expect(result.current.artistList[0]?.slug).toBe('radiohead');
    expect(result.current.artistList[0]?.upcomingShowCount).toBe(2);
    expect(result.current.failed).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fails and drops the previous results when the artist lookup rejects', async () => {
    const { result } = renderHook(() => useSearch());
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();
    expect(result.current.artistList).toHaveLength(1);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/search/artists')) {
        return Promise.reject(new Error('artist lookup failed'));
      }
      return Promise.resolve({ json: async () => EVENTS_RESPONSE } as Response);
    });

    act(() => {
      result.current.setQuery('bluebird');
    });
    await flush();

    expect(result.current.artistList).toHaveLength(0);
    expect(result.current.failed).toBe(true);
    expect(result.current.isLoading).toBe(false);
    consoleError.mockRestore();
  });

  it('fails rather than loading forever when the token read rejects', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { result } = renderHook(() => useSearch());
    await flush();
    // After mount, so only the search's own token read rejects.
    stableGetToken.mockRejectedValue(new Error('clerk down'));

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();

    expect(result.current.failed).toBe(true);
    expect(result.current.isLoading).toBe(false);
    consoleError.mockRestore();
  });

  it('fails on a success:false body and recovers on retry', async () => {
    const { result } = renderHook(() => useSearch());
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const working = global.fetch;

    global.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        json: async () =>
          url.includes('/v1/search/artists')
            ? { success: false }
            : EVENTS_RESPONSE,
      } as Response),
    );

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();
    expect(result.current.failed).toBe(true);

    global.fetch = working;
    act(() => {
      result.current.retry();
    });
    expect(result.current.failed).toBe(false);
    await flush();

    expect(result.current.failed).toBe(false);
    expect(result.current.artistList).toHaveLength(1);
    consoleError.mockRestore();
  });

  it('keeps loading until both the events and the artist fetch settle', async () => {
    let releaseArtists: (res: Response) => void = () => {};
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/search/artists')) {
        return new Promise<Response>((resolve) => {
          releaseArtists = resolve;
        });
      }
      return Promise.resolve({ json: async () => EVENTS_RESPONSE } as Response);
    });
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();
    expect(result.current.artistResults.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      releaseArtists({
        json: async () => ARTIST_PAGES_RESPONSE,
      } as Response);
      for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.artistList).toHaveLength(1);
  });

  it('does not query artists below the two-character floor', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('r');
    });

    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/v1/search/artists'),
      expect.anything(),
    );
    expect(result.current.artistList).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('clears the artist list when the query is cleared', async () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radio');
    });
    await flush();
    act(() => {
      result.current.clearQuery();
    });

    expect(result.current.artistList).toEqual([]);
  });

  it('navigates to the artist page, not a filtered browse query', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('radiohead');
    });
    act(() => {
      result.current.navigateTo('artistPage', { slug: 'radiohead' });
    });

    expect(mockPush).toHaveBeenCalledWith('/artists/radiohead');
  });
});
