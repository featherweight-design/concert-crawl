// @vitest-environment jsdom
//
// Load More has to ask for the same filtered set page 1 was rendered from.
// It did not: the server component translated the page-URL chips into the
// API's own params and this hook forwarded them raw, so `filterFollowing=1`
// ("My artists"), `filterWhere` and `filterWhen` were stripped by the
// non-strict request schema and page 2 appended unfiltered rows.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { EventsListResponse } from '@concert-crawl/types'

const { authState, requests } = vi.hoisted(() => ({
  authState: { userId: null as string | null },
  requests: { public: [] as string[], credentialed: [] as string[] },
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => (authState.userId ? 'test-token' : null),
    userId: authState.userId,
  }),
}))

vi.mock('./use-spotify-connection', () => ({
  useSpotifyConnection: () => ({ data: null }),
}))

const page = (offset: number): EventsListResponse => ({
  data: [],
  total: 60,
  limit: 20,
  offset,
})

const offsetOf = (path: string): number =>
  Number(new URL(path, 'https://x').searchParams.get('offset') ?? 0)

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number) {
      super(`status ${status}`)
      this.status = status
    }
  },
  publicApiClient: {
    get: async (path: string) => {
      requests.public.push(path)
      return page(offsetOf(path))
    },
  },
  apiClient: {
    get: async (path: string) => {
      requests.credentialed.push(path)
      return page(offsetOf(path))
    },
  },
}))

import { useEvents } from './use-events'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const allRequests = (): string[] => [
  ...requests.public,
  ...requests.credentialed,
]

const renderAndLoadMore = async (searchParamsString: string) => {
  const { result } = renderHook(
    () => useEvents({ searchParamsString, limit: 20 }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.hasNextPage).toBe(true))
  await act(async () => {
    await result.current.fetchNextPage()
  })
  await waitFor(() => expect(allRequests().length).toBeGreaterThan(1))
  return allRequests()[allRequests().length - 1]!
}

describe('useEvents pagination', () => {
  beforeEach(() => {
    authState.userId = null
    requests.public = []
    requests.credentialed = []
  })

  it('carries the "My artists" scope onto page 2', async () => {
    authState.userId = 'user_1'
    const nextPage = await renderAndLoadMore('filterFollowing=1')

    const params = new URL(nextPage, 'https://x').searchParams
    expect(params.get('following')).toBe('1')
    expect(params.get('offset')).toBe('20')
    expect(params.has('filterFollowing')).toBe(false)
    // A scoped list is personalized, so page 2 must go out credentialed —
    // an anonymous fetch cannot hold the scope at all.
    expect(requests.credentialed.length).toBeGreaterThan(0)
  })

  it('carries the venue and date chips onto page 2', async () => {
    const nextPage = await renderAndLoadMore(
      'filterWhere=ogden-theatre&from=2026-07-01&to=2026-07-31&filterPrice=under-25',
    )

    const params = new URL(nextPage, 'https://x').searchParams
    expect(params.get('venueSlug')).toBe('ogden-theatre')
    expect(params.get('from')).toBe('2026-07-01')
    expect(params.get('to')).toBe('2026-07-31')
    expect(params.get('filterPrice')).toBe('under-25')
    expect(params.has('filterWhere')).toBe(false)
  })

  it('drops a scope a signed-out viewer cannot hold', async () => {
    const nextPage = await renderAndLoadMore('filterFollowing=1&filterTaste=1')

    const params = new URL(nextPage, 'https://x').searchParams
    expect(params.has('following')).toBe(false)
    expect(params.has('taste')).toBe(false)
    // No token, so nothing personalized — the anonymous fetch stays cacheable
    // by the service worker.
    expect(requests.credentialed).toHaveLength(0)
  })
})
