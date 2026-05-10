# Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/search` route (mobile full-screen page) and desktop command palette, wiring the dead search nav link and completing the search empty state deferred from PR #145.

**Architecture:** A shared `useSearch` hook encapsulates all state (query, debounce, localStorage recent searches, popular events, derived artist/venue results). The mobile page at `/search` and the desktop `SearchPalette` overlay both consume this hook — no logic lives in the components. The API gets two changes: venue name added to the events search `or()` clause, and a new `GET /v1/search/popular` endpoint ordered by watcher count.

**Tech Stack:** Hono (API), Drizzle ORM, Next.js 14 App Router, React hooks, `@testing-library/react` + Vitest (web tests), Vitest integration tests with real Postgres (API tests).

**Worktree:** `.worktrees/feat/search-page` on branch `feat/search-page`. All work happens here.

---

## File Map

**Create:**

- `apps/api/src/routes/search.ts` — `GET /v1/search/popular` endpoint
- `apps/api/src/routes/search.integration.test.ts` — integration tests for popular endpoint
- `apps/web/src/lib/search/useSearch.ts` — shared hook (query, debounce, localStorage, navigation)
- `apps/web/src/lib/search/useSearch.test.ts` — hook unit tests
- `apps/web/src/app/(protected)/search/page.tsx` — mobile `/search` route (thin wrapper)
- `apps/web/src/components/consumer/search/SearchBar.tsx` — sticky search input with back arrow
- `apps/web/src/components/consumer/search/SearchDefaultState.tsx` — recent + popular lists
- `apps/web/src/components/consumer/search/SearchResultsState.tsx` — artist + venue result sections
- `apps/web/src/components/consumer/search/SearchEmptyState.tsx` — no-results state using EmptyState
- `apps/web/src/components/consumer/search/SearchPage.test.tsx` — mobile page component tests
- `apps/web/src/components/consumer/search-palette/SearchPalette.tsx` — desktop palette overlay
- `apps/web/src/components/consumer/search-palette/SearchPalette.test.tsx` — palette tests

**Modify:**

- `apps/api/src/routes/events.ts` — add `venues.name` to search `or()`, fix count query join
- `apps/api/src/routes/events.integration.test.ts` — add venue name search test
- `apps/api/src/routes/index.ts` — register `searchRouter` at `/v1/search`
- `apps/web/src/components/consumer/definitions/copy.ts` — add `search.*` keys
- `apps/web/src/components/consumer/app-header/AppHeader.tsx` — convert desktop search to palette trigger, add ⌘K listener, render `SearchPalette`

---

## Task 1: Extend events search to include venue name

**Files:**

- Modify: `apps/api/src/routes/events.ts`
- Modify: `apps/api/src/routes/events.integration.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('GET /v1/events — integration')` block in `apps/api/src/routes/events.integration.test.ts`:

```ts
it('searches by venue name', async () => {
  const venue = await seedVenue({
    name: 'Bluebird Theater',
    slug: 'bluebird-theater',
  })
  await seedEvent(venue.id, {
    title: 'Rock Night',
    artist: 'Test Band',
    date: '2027-06-01',
  })

  const res = await app.request('/v1/events?search=Bluebird')
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    success: boolean
    data: { data: { title: string }[]; total: number }
  }
  expect(body.data.data).toHaveLength(1)
  expect(body.data.data[0]?.title).toBe('Rock Night')
  expect(body.data.total).toBe(1)
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/search-page
pnpm --filter @concert-crawl/api test -- --reporter=verbose 2>&1 | grep -A3 "searches by venue name"
```

Expected: FAIL — `Rock Night` not found because `venues.name` isn't searched yet.

- [ ] **Step 3: Extend the search condition and fix the count query**

In `apps/api/src/routes/events.ts`, the events route already joins venues for the main select. Apply two changes:

**Change 1** — add `venues.name` to the search `or()` (lines 89–95):

```ts
if (search) {
  const searchCondition = or(
    ilike(events.title, `%${search}%`),
    ilike(events.artist, `%${search}%`),
    ilike(venues.name, `%${search}%`),
  )
  if (searchCondition) conditions.push(searchCondition)
}
```

**Change 2** — add the venues join to the count query so it resolves `venues.name` correctly (currently at lines 122–128):

```ts
const countResult = await db
  .select({ total: count() })
  .from(events)
  .innerJoin(venues, eq(events.venueId, venues.id))
  .where(where)
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm --filter @concert-crawl/api test -- --reporter=verbose 2>&1 | grep -A3 "searches by venue name"
```

Expected: PASS

- [ ] **Step 5: Run the full API test suite to check for regressions**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/huey/Projects/concert-crawl/.worktrees/feat/search-page
git add apps/api/src/routes/events.ts apps/api/src/routes/events.integration.test.ts
git commit -m "feat(api): extend events search to match venue name"
```

---

## Task 2: New `GET /v1/search/popular` endpoint

**Files:**

- Create: `apps/api/src/routes/search.ts`
- Create: `apps/api/src/routes/search.integration.test.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Write the failing integration test**

Create `apps/api/src/routes/search.integration.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserEvent,
} from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/search/popular', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns 200 without auth', async () => {
    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
  })

  it('returns top 5 upcoming events ordered by watcher count descending', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })

    const eventA = await seedEvent(venue.id, {
      title: 'Show A',
      artist: 'Artist A',
      date: '2027-06-01',
    })
    const eventB = await seedEvent(venue.id, {
      title: 'Show B',
      artist: 'Artist B',
      date: '2027-06-02',
    })
    const eventC = await seedEvent(venue.id, {
      title: 'Show C',
      artist: 'Artist C',
      date: '2027-06-03',
    })

    // eventC gets 3 watchers, eventA gets 1
    await seedUserEvent('user-1', eventC.id, { status: 'watching' })
    await seedUserEvent('user-2', eventC.id, { status: 'watching' })
    await seedUserEvent('user-3', eventC.id, { status: 'watching' })
    await seedUserEvent('user-4', eventA.id, { status: 'watching' })

    const res = await app.request('/v1/search/popular')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        title: string
        watcherCount: number
        venue: { name: string; slug: string }
      }[]
    }

    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(3)
    expect(body.data[0]?.title).toBe('Show C')
    expect(body.data[0]?.watcherCount).toBe(3)
    expect(body.data[1]?.title).toBe('Show A')
    expect(body.data[0]?.venue.name).toBe('Globe Hall')
    expect(body.data[0]?.venue.slug).toBe('globe-hall')
  })

  it('falls back to soonest events when no watchers exist', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    await seedEvent(venue.id, { title: 'Show A', date: '2027-06-01' })
    await seedEvent(venue.id, { title: 'Show B', date: '2027-06-02' })

    const res = await app.request('/v1/search/popular')
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; watcherCount: number }[]
    }

    expect(body.data).toHaveLength(2)
    expect(body.data[0]?.watcherCount).toBe(0)
    expect(body.data[0]?.title).toBe('Show A') // soonest first
  })

  it('returns at most 5 results', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    for (let idx = 0; idx < 8; idx++) {
      await seedEvent(venue.id, {
        title: `Show ${idx}`,
        date: `2027-06-0${idx + 1}`,
      })
    }

    const res = await app.request('/v1/search/popular')
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.data).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter @concert-crawl/api test -- --reporter=verbose 2>&1 | grep -A5 "GET /v1/search/popular"
```

Expected: FAIL — route does not exist yet (404).

- [ ] **Step 3: Create the search router**

Create `apps/api/src/routes/search.ts`:

```ts
import { Hono } from 'hono'
import { db, events, userEvents, venues } from '@concert-crawl/db'
import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'

export const searchRouter = new Hono()

// GET /v1/search/popular — top 5 upcoming events by watcher count, no auth required
searchRouter.get('/popular', async (ctx) => {
  const today = todayInTimezone('UTC')

  const watcherCount = sql<number>`cast(count(${userEvents.id}) as int)`

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      date: events.date,
      ticketPriceMin: events.ticketPriceMin,
      watcherCount,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(
      userEvents,
      and(eq(userEvents.eventId, events.id), eq(userEvents.status, 'watching')),
    )
    .where(and(eq(events.status, 'upcoming'), gte(events.date, today)))
    .groupBy(events.id, venues.name, venues.slug)
    .orderBy(desc(watcherCount), asc(events.date))
    .limit(5)

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    date: row.date,
    ticketPriceMin: row.ticketPriceMin,
    watcherCount: row.watcherCount,
    venue: { name: row.venueName, slug: row.venueSlug },
  }))

  return ctx.json({ success: true, data })
})
```

- [ ] **Step 4: Register the router in `apps/api/src/routes/index.ts`**

Add the import and registration alongside the existing routes:

```ts
import { searchRouter } from './search.js'
// ... inside registerRoutes:
app.route('/v1/search', searchRouter)
```

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/api test -- --reporter=verbose 2>&1 | grep -A3 "GET /v1/search/popular"
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Run the full API test suite**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/search.ts apps/api/src/routes/search.integration.test.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add GET /v1/search/popular endpoint ordered by watcher count"
```

---

## Task 3: Add search copy keys

**Files:**

- Modify: `apps/web/src/components/consumer/definitions/copy.ts`

- [ ] **Step 1: Add search keys to the copy object**

In `apps/web/src/components/consumer/definitions/copy.ts`, add these keys inside the `copy` object before the closing `} as const`:

```ts
  // ── Search ─────────────────────────────────────────────────────────
  searchNoResultsEyebrow: 'No results',
  searchNoResultsBody:
    "Try another spelling, or browse what's on tonight.",
  searchNoResultsCta: 'Browse all shows',
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/definitions/copy.ts
git commit -m "feat(web): add search empty state copy keys"
```

---

## Task 4: Build the `useSearch` hook

**Files:**

- Create: `apps/web/src/lib/search/useSearch.ts`
- Create: `apps/web/src/lib/search/useSearch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/search/useSearch.test.ts`:

```ts
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
      (a) => a.name === 'Radiohead',
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
      (v) => v.slug === 'red-rocks',
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "useSearch|FAIL|PASS" | head -20
```

Expected: FAIL — `useSearch` not found.

- [ ] **Step 3: Implement `useSearch`**

Create `apps/web/src/lib/search/useSearch.ts`:

```ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const RECENT_KEY = 'cc_recent_searches'
const MAX_RECENT = 5
const DEBOUNCE_MS = 300

export interface ArtistResult {
  name: string
  nextDate: string
  venueShort: string
}

export interface VenueResult {
  name: string
  slug: string
  showCount: number
}

export interface PopularEvent {
  id: string
  title: string
  artist: string
  date: string
  ticketPriceMin: string | null
  watcherCount: number
  venue: { name: string; slug: string }
}

interface EventRow {
  artist: string
  date: string
  title: string
  venue: { name: string; slug: string }
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeRecent(searches: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RECENT_KEY, JSON.stringify(searches))
}

function addToRecent(query: string, current: string[]): string[] {
  const filtered = current.filter((s) => s !== query)
  return [query, ...filtered].slice(0, MAX_RECENT)
}

function deriveArtistResults(rows: EventRow[]): ArtistResult[] {
  const map = new Map<string, ArtistResult>()
  for (const row of rows) {
    const existing = map.get(row.artist)
    if (!existing || row.date < existing.nextDate) {
      map.set(row.artist, {
        name: row.artist,
        nextDate: row.date,
        venueShort: row.venue.name,
      })
    }
  }
  return Array.from(map.values())
}

function deriveVenueResults(rows: EventRow[]): VenueResult[] {
  const map = new Map<string, VenueResult>()
  for (const row of rows) {
    const existing = map.get(row.venue.slug)
    if (existing) {
      existing.showCount += 1
    } else {
      map.set(row.venue.slug, {
        name: row.venue.name,
        slug: row.venue.slug,
        showCount: 1,
      })
    }
  }
  return Array.from(map.values())
}

export function useSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularEvents, setPopularEvents] = useState<PopularEvent[]>([])
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([])
  const [venueResults, setVenueResults] = useState<VenueResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecentSearches(readRecent())

    fetch(`${API_URL}/v1/search/popular`)
      .then((res) => res.json())
      .then((body: { success: boolean; data: PopularEvent[] }) => {
        if (body.success) setPopularEvents(body.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setArtistResults([])
      setVenueResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      fetch(
        `${API_URL}/v1/events?search=${encodeURIComponent(trimmed)}&limit=100`,
      )
        .then((res) => res.json())
        .then((body: { success: boolean; data: { data: EventRow[] } }) => {
          if (body.success) {
            setArtistResults(deriveArtistResults(body.data.data))
            setVenueResults(deriveVenueResults(body.data.data))
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const clearQuery = useCallback(() => {
    setQuery('')
    setArtistResults([])
    setVenueResults([])
  }, [])

  const navigateTo = useCallback(
    (type: 'artist' | 'venue', value: string | { slug: string }) => {
      const updated = addToRecent(query, recentSearches)
      setRecentSearches(updated)
      writeRecent(updated)

      if (type === 'artist' && typeof value === 'string') {
        router.push(`/events?search=${encodeURIComponent(value)}`)
      } else if (type === 'venue' && typeof value === 'object') {
        router.push(`/venues/${value.slug}`)
      }
    },
    [query, recentSearches, router],
  )

  return {
    query,
    setQuery,
    clearQuery,
    recentSearches,
    popularEvents,
    artistResults,
    venueResults,
    isLoading,
    navigateTo,
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "useSearch|✓|✗|PASS|FAIL"
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/search/useSearch.ts apps/web/src/lib/search/useSearch.test.ts
git commit -m "feat(web): add useSearch hook with debounce, localStorage, and navigation"
```

---

## Task 5: Build mobile search page components

**Files:**

- Create: `apps/web/src/components/consumer/search/SearchBar.tsx`
- Create: `apps/web/src/components/consumer/search/SearchDefaultState.tsx`
- Create: `apps/web/src/components/consumer/search/SearchResultsState.tsx`
- Create: `apps/web/src/components/consumer/search/SearchEmptyState.tsx`
- Create: `apps/web/src/components/consumer/search/SearchPage.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `apps/web/src/components/consumer/search/SearchPage.test.tsx`:

```ts
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
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
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
    render(<SearchDefaultState recentSearches={recentSearches} popularEvents={[]} onPickQuery={mockSetQuery} onPickEvent={mockNavigateTo} />)
    expect(screen.getByText('Recent')).toBeTruthy()
    expect(screen.getByText('godspeed you')).toBeTruthy()
    expect(screen.getByText('bluebird')).toBeTruthy()
  })

  it('calls onPickQuery when a recent row is tapped', () => {
    render(<SearchDefaultState recentSearches={['bluebird']} popularEvents={[]} onPickQuery={mockSetQuery} onPickEvent={mockNavigateTo} />)
    fireEvent.click(screen.getByText('bluebird'))
    expect(mockSetQuery).toHaveBeenCalledWith('bluebird')
  })

  it('renders popular section with event rows', () => {
    const popular = [
      { id: 'ev-1', title: 'Show A', artist: 'Artist A', date: '2027-06-01',
        ticketPriceMin: '25', watcherCount: 3, venue: { name: 'Globe Hall', slug: 'globe-hall' } },
    ]
    render(<SearchDefaultState recentSearches={[]} popularEvents={popular} onPickQuery={mockSetQuery} onPickEvent={mockNavigateTo} />)
    expect(screen.getByText('Popular this week')).toBeTruthy()
    expect(screen.getByText('Artist A')).toBeTruthy()
  })
})

describe('SearchResultsState', () => {
  it('renders artist section with count', () => {
    const artists = [{ name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' }]
    render(<SearchResultsState artistResults={artists} venueResults={[]} onNavigateTo={mockNavigateTo} />)
    expect(screen.getByText('Artists · 1')).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
  })

  it('renders venue section with count', () => {
    const venues = [{ name: 'Bluebird Theater', slug: 'bluebird-theater', showCount: 4 }]
    render(<SearchResultsState artistResults={[]} venueResults={venues} onNavigateTo={mockNavigateTo} />)
    expect(screen.getByText('Venues · 1')).toBeTruthy()
    expect(screen.getByText('Bluebird Theater')).toBeTruthy()
  })

  it('calls onNavigateTo with artist on tap', () => {
    const artists = [{ name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' }]
    render(<SearchResultsState artistResults={artists} venueResults={[]} onNavigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText('Radiohead'))
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead')
  })

  it('calls onNavigateTo with venue on tap', () => {
    const venues = [{ name: 'Bluebird Theater', slug: 'bluebird-theater', showCount: 4 }]
    render(<SearchResultsState artistResults={[]} venueResults={venues} onNavigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText('Bluebird Theater'))
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', { slug: 'bluebird-theater' })
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "SearchDefaultState|SearchResultsState|SearchEmptyState" | head -15
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `SearchBar`**

Create `apps/web/src/components/consumer/search/SearchBar.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowLeft } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  onClear: () => void
  showBack?: boolean
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  onClear,
  showBack = false,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px 12px',
      }}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 44,
          padding: '0 14px',
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            color: 'var(--fg-muted)',
            flexShrink: 0,
            display: 'inline-flex',
          }}
        >
          <Search size={18} strokeWidth={1.5} />
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          placeholder="Search artists, venues…"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            fontSize: 15,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
          }}
        />
        {value && (
          <button
            onClick={onClear}
            aria-label="Clear search"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 24,
              height: 24,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-3)',
              color: 'var(--fg-muted)',
              flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `SearchDefaultState`**

Create `apps/web/src/components/consumer/search/SearchDefaultState.tsx`:

```tsx
import { History, Flame } from 'lucide-react'
import type { PopularEvent } from '../../../lib/search/useSearch'

interface SearchDefaultStateProps {
  recentSearches: string[]
  popularEvents: PopularEvent[]
  onPickQuery: (query: string) => void
  onPickEvent: (type: 'artist', value: string) => void
}

function SectionHeader({
  icon,
  label,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 16px 8px',
      }}
    >
      <span
        style={{
          color: accent ? 'var(--accent)' : 'var(--fg-muted)',
          display: 'inline-flex',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function SearchDefaultState({
  recentSearches,
  popularEvents,
  onPickQuery,
  onPickEvent,
}: SearchDefaultStateProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40 }}
    >
      {recentSearches.length > 0 && (
        <>
          <SectionHeader
            icon={<History size={13} strokeWidth={1.5} />}
            label="Recent"
          />
          {recentSearches.map((query) => (
            <button
              key={query}
              onClick={() => onPickQuery(query)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}
            >
              <span
                style={{
                  color: 'var(--fg-subtle)',
                  display: 'inline-flex',
                  flexShrink: 0,
                }}
              >
                <History size={16} strokeWidth={1.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  fontSize: 14,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                }}
              >
                {query}
              </span>
            </button>
          ))}
          <div style={{ height: 8 }} />
        </>
      )}

      {popularEvents.length > 0 && (
        <>
          <SectionHeader
            icon={<Flame size={13} strokeWidth={1.5} />}
            label="Popular this week"
            accent
          />
          {popularEvents.map((event, idx) => (
            <button
              key={event.id}
              onClick={() => onPickEvent('artist', event.artist)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                boxSizing: 'border-box' as const,
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--fg)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.artist}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {event.venue.name}
                </span>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: event.ticketPriceMin
                    ? 'var(--signal)'
                    : 'var(--fg-subtle)',
                }}
              >
                {event.ticketPriceMin ? `$${event.ticketPriceMin}` : 'TBA'}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
```

Note: you'll need to add `import React from 'react'` at the top (or ensure the tsconfig has `jsx: react-jsx`).

- [ ] **Step 5: Create `SearchResultsState`**

Create `apps/web/src/components/consumer/search/SearchResultsState.tsx`:

```tsx
import { MapPin, User } from 'lucide-react'
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch'

interface SearchResultsStateProps {
  artistResults: ArtistResult[]
  venueResults: VenueResult[]
  onNavigateTo: (
    type: 'artist' | 'venue',
    value: string | { slug: string },
  ) => void
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ padding: '0 16px 8px' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ height: 1, background: 'var(--border)', marginLeft: 68 }} />
  )
}

export function SearchResultsState({
  artistResults,
  venueResults,
  onNavigateTo,
}: SearchResultsStateProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40 }}
    >
      {artistResults.length > 0 && (
        <>
          <SectionHeader label={`Artists · ${artistResults.length}`} />
          {artistResults.map((artist, idx) => (
            <div key={artist.name}>
              {idx > 0 && <Divider />}
              <button
                onClick={() => onNavigateTo('artist', artist.name)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-muted)',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--fg)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {artist.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--fg-muted)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {artist.venueShort}
                  </div>
                </div>
              </button>
            </div>
          ))}
          {venueResults.length > 0 && <div style={{ height: 16 }} />}
        </>
      )}

      {venueResults.length > 0 && (
        <>
          <SectionHeader label={`Venues · ${venueResults.length}`} />
          {venueResults.map((venue, idx) => (
            <div key={venue.slug}>
              {idx > 0 && <Divider />}
              <button
                onClick={() => onNavigateTo('venue', { slug: venue.slug })}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-muted)',
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={18} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--fg)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {venue.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--fg-muted)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {venue.showCount} upcoming show
                    {venue.showCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `SearchEmptyState`**

Create `apps/web/src/components/consumer/search/SearchEmptyState.tsx`:

```tsx
import { EmptyState } from '../empty-state/EmptyState'
import { copy } from '../definitions/copy'

interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <EmptyState
      state="filtered"
      density="default"
      eyebrow={copy.searchNoResultsEyebrow}
      title={`Nothing for "${query}".`}
      body={copy.searchNoResultsBody}
      primaryCta={{ label: copy.searchNoResultsCta, href: '/events' }}
    />
  )
}
```

- [ ] **Step 7: Run the component tests**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "SearchDefaultState|SearchResultsState|SearchEmptyState|✓|✗" | head -20
```

Expected: all tests PASS.

- [ ] **Step 8: Run the full web test suite**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/consumer/search/
git commit -m "feat(web): build mobile search page components"
```

---

## Task 6: Wire the `/search` page

**Files:**

- Create: `apps/web/src/app/(protected)/search/page.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/src/app/(protected)/search/page.tsx`:

```tsx
'use client'

import { useSearch } from '../../../lib/search/useSearch'
import { SearchBar } from '../../../components/consumer/search/SearchBar'
import { SearchDefaultState } from '../../../components/consumer/search/SearchDefaultState'
import { SearchResultsState } from '../../../components/consumer/search/SearchResultsState'
import { SearchEmptyState } from '../../../components/consumer/search/SearchEmptyState'

export default function SearchPage() {
  const {
    query,
    setQuery,
    clearQuery,
    recentSearches,
    popularEvents,
    artistResults,
    venueResults,
    navigateTo,
  } = useSearch()

  const hasResults = artistResults.length > 0 || venueResults.length > 0

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 62,
      }}
    >
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={clearQuery}
        showBack
        autoFocus
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {query.trim() === '' && (
          <SearchDefaultState
            recentSearches={recentSearches}
            popularEvents={popularEvents}
            onPickQuery={setQuery}
            onPickEvent={navigateTo}
          />
        )}
        {query.trim() !== '' && hasResults && (
          <SearchResultsState
            artistResults={artistResults}
            venueResults={venueResults}
            onNavigateTo={navigateTo}
          />
        )}
        {query.trim() !== '' && !hasResults && (
          <SearchEmptyState query={query} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(protected\)/search/page.tsx
git commit -m "feat(web): wire /search page"
```

---

## Task 7: Build the desktop `SearchPalette`

**Files:**

- Create: `apps/web/src/components/consumer/search-palette/SearchPalette.tsx`
- Create: `apps/web/src/components/consumer/search-palette/SearchPalette.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/consumer/search-palette/SearchPalette.test.tsx`:

```ts
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
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))
vi.mock('../../lib/search/useSearch', () => ({
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
    venueResults: [
      { name: 'Red Rocks', slug: 'red-rocks', showCount: 3 },
    ],
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
    const { container } = render(<SearchPalette open={false} onClose={onClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the palette when open', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    expect(screen.getByPlaceholderText('Search artists or venues…')).toBeTruthy()
  })

  it('calls onClose when Escape is pressed', () => {
    render(<SearchPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(<SearchPalette open={true} onClose={onClose} />)
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "SearchPalette|✓|✗" | head -15
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SearchPalette`**

Create `apps/web/src/components/consumer/search-palette/SearchPalette.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSearch } from '../../../lib/search/useSearch'
import { SearchDefaultState } from '../search/SearchDefaultState'
import { SearchResultsState } from '../search/SearchResultsState'
import { SearchEmptyState } from '../search/SearchEmptyState'

interface SearchPaletteProps {
  open: boolean
  onClose: () => void
}

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const search = useSearch()
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIdx(-1)
  }, [search.query])

  // Autofocus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      search.clearQuery()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const allResults = [...search.artistResults, ...search.venueResults]

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, allResults.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, -1))
      } else if (event.key === 'Enter' && selectedIdx >= 0) {
        event.preventDefault()
        const artistCount = search.artistResults.length
        if (selectedIdx < artistCount) {
          const artist = search.artistResults[selectedIdx]
          if (artist) {
            search.navigateTo('artist', artist.name)
            onClose()
          }
        } else {
          const venue = search.venueResults[selectedIdx - artistCount]
          if (venue) {
            search.navigateTo('venue', { slug: venue.slug })
            onClose()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIdx, search, onClose])

  if (!open) return null

  const hasResults =
    search.artistResults.length > 0 || search.venueResults.length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          width: 560,
          maxHeight: 540,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        {/* Search bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 18px',
            height: 56,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}>
            <Search size={18} strokeWidth={1.5} />
          </span>
          <input
            ref={inputRef}
            value={search.query}
            onChange={(ev) => search.setQuery(ev.target.value)}
            placeholder="Search artists or venues…"
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              fontSize: 15,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
            }}
          />
          {search.query && (
            <button
              onClick={search.clearQuery}
              aria-label="Clear"
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 22,
                height: 22,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                color: 'var(--fg-muted)',
              }}
            >
              <X size={10} strokeWidth={1.5} />
            </button>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-subtle)',
              padding: '3px 6px',
              borderRadius: 4,
              border: '1px solid var(--border-strong)',
            }}
          >
            esc
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {search.query.trim() === '' && (
            <SearchDefaultState
              recentSearches={search.recentSearches}
              popularEvents={search.popularEvents}
              onPickQuery={search.setQuery}
              onPickEvent={search.navigateTo}
            />
          )}
          {search.query.trim() !== '' && hasResults && (
            <SearchResultsState
              artistResults={search.artistResults}
              venueResults={search.venueResults}
              onNavigateTo={(type, value) => {
                search.navigateTo(type, value)
                onClose()
              }}
            />
          )}
          {search.query.trim() !== '' && !hasResults && (
            <SearchEmptyState query={search.query} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: '0 16px',
            height: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <kbd style={kbdStyle}>↑</kbd>
            <kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <kbd style={kbdStyle}>↵</kbd> open
          </span>
          <span
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: 'var(--accent)' }}>●</span>
            concert<span style={{ color: 'var(--accent)' }}>crawl.</span>
          </span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-1)',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm --filter @concert-crawl/web test -- --reporter=verbose 2>&1 | grep -E "SearchPalette|✓|✗" | head -15
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Run the full web test suite**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/search-palette/
git commit -m "feat(web): build SearchPalette desktop command palette"
```

---

## Task 8: Wire `AppHeader` with palette trigger and ⌘K shortcut

**Files:**

- Modify: `apps/web/src/components/consumer/app-header/AppHeader.tsx`

- [ ] **Step 1: Update `AppHeader`**

Replace the entire contents of `apps/web/src/components/consumer/app-header/AppHeader.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '../theme-toggle'
import { CCMark } from '../cc-mark'
import { UserMenu } from '../user-menu'
import { MobileProfileEntry } from './MobileProfileEntry'
import { SearchPalette } from '../search-palette/SearchPalette'

const NAV_TABS = [
  { label: 'Browse', href: '/events' },
  { label: 'Search', href: '/search' },
  { label: 'Watching', href: '/watching' },
] as const

export function AppHeader() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="w-full">
        {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
        <div className="flex items-center justify-between bg-bg px-4 pb-2.5 pt-[62px] sm:hidden">
          <Link href="/events" className="flex items-center gap-2">
            <CCMark size={28} />
            <span
              className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              concert
              <span className="text-accent">crawl.</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong"
            >
              <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
            </Link>
            <MobileProfileEntry />
          </div>
        </div>

        {/* ── Desktop TopNav (shown sm+) ──────────────────── */}
        <div className="sticky top-0 z-40 hidden h-16 w-full items-center justify-between border-b border-border bg-bg-elevated px-8 sm:flex">
          {/* Left: logo + nav tabs */}
          <div className="flex items-center gap-8">
            <Link href="/events" className="flex items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[7px]">
                <CCMark size={32} />
              </div>
              <span
                className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                concert<span className="text-accent">crawl.</span>
              </span>
            </Link>

            <nav className="flex gap-1 overflow-x-auto">
              {NAV_TABS.map((tab) => {
                const isActive = pathname.startsWith(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'shrink-0 rounded-lg px-[14px] py-[8px] text-[13px] tracking-[-0.01em]',
                      isActive
                        ? 'bg-surface-2 font-bold text-fg'
                        : 'bg-transparent font-medium text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg',
                    )}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: search trigger + user avatar + theme */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-fg-subtle lg:w-[280px] lg:justify-start"
            >
              <Search size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="hidden flex-1 text-[13px] lg:block">
                Search artists or venues…
              </span>
              <span
                className="hidden rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-subtle lg:block"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ⌘K
              </span>
            </button>

            <UserMenu />

            <ThemeToggle />
          </div>
        </div>
      </header>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: zero errors.

- [ ] **Step 3: Run the full web test suite**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass.

- [ ] **Step 4: Run the full API test suite**

```bash
pnpm --filter @concert-crawl/api test
```

Expected: all tests pass.

- [ ] **Step 5: Typecheck + lint everything**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors and zero warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/consumer/app-header/AppHeader.tsx
git commit -m "feat(web): wire AppHeader with SearchPalette and ⌘K shortcut"
```

---

## Final: close the issue and push

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/search-page
```

- [ ] **Step 2: Open the PR**

Use the `.github/pull_request_template.md` structure. Include `Closes #57` in the body. List no new environment variables.
