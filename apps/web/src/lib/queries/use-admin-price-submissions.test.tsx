// @vitest-environment jsdom

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PriceSubmissionHistoryRow } from './use-admin-price-submissions'

const mockGetToken = vi.fn<() => Promise<string | null>>()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

// apiClient.get is the paging primitive the hook walks. Each mock impl below
// keys its response off the offset= param in the URL.
const mockGet = vi.fn<(url: string, token: string) => Promise<unknown>>()
vi.mock('@/lib/api', () => ({
  apiClient: { get: (url: string, token: string) => mockGet(url, token) },
}))

import { useAdminPriceSubmissions } from './use-admin-price-submissions'

const stubRow = (id: string): PriceSubmissionHistoryRow => ({
  id,
  eventId: 'evt',
  userId: 'user',
  priceMin: '40',
  priceMax: null,
  status: 'pending',
  disputedSubmissionId: null,
  createdAt: '2026-07-01T00:00:00Z',
  lastSeenAt: null,
  lastSeenBy: null,
  eventTitle: 'Show',
  eventDate: null,
  ticketUrl: null,
  venueName: null,
})

const page = (count: number, prefix: string): PriceSubmissionHistoryRow[] =>
  Array.from({ length: count }, (_, idx) => stubRow(`${prefix}-${idx}`))

const offsetOf = (url: string): number =>
  Number(new URLSearchParams(url.split('?')[1]).get('offset'))

const withProvider = (staleTime = 0) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('useAdminPriceSubmissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue('test-token')
  })

  it('fetches a single page when total fits under the page size', async () => {
    mockGet.mockResolvedValue({ rows: page(30, 'p0'), total: 30 })
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toHaveLength(30)
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet.mock.calls[0]?.[0]).toContain('offset=0')
  })

  it('walks offsets and accumulates the final partial page', async () => {
    // 150 total: first page full (100) via count=true, second page partial
    // (50) via the non-count path, which returns a bare rows array.
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        offsetOf(url) === 0
          ? { rows: page(100, 'p0'), total: 150 }
          : page(50, 'p100'),
      ),
    )
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toHaveLength(150))
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet.mock.calls[1]?.[0]).toContain('offset=100')
  })

  it('advances the offset by rows received so a short middle page skips nothing', async () => {
    // 150 total across three pages where the middle page is short (30, not
    // 100). Advancing by FETCH_PAGE_SIZE would jump to offset=200 and skip
    // the final 20 rows; advancing by rows received keeps offsets aligned.
    mockGet.mockImplementation((url: string) => {
      const offset = offsetOf(url)
      if (offset === 0)
        return Promise.resolve({ rows: page(100, 'p0'), total: 150 })
      if (offset === 100) return Promise.resolve(page(30, 'p100'))
      return Promise.resolve(page(20, 'p130'))
    })
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toHaveLength(150))
    expect(mockGet).toHaveBeenCalledTimes(3)
    expect(mockGet.mock.calls[2]?.[0]).toContain('offset=130')
  })

  it('stops early if a page returns no rows despite a larger reported total', async () => {
    // Defensive: a stale/racey total must not spin the loop forever.
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        offsetOf(url) === 0 ? { rows: page(100, 'p0'), total: 500 } : [],
      ),
    )
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toHaveLength(100))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('refetches the full set on mount even when SSR initialData is fresh', async () => {
    // Reproduces the staleTime bug: with the app's 30-min staleTime the SSR
    // seed would be treated as fresh and fetchAllSubmissions would never run,
    // stranding the page on the first page. initialDataUpdatedAt: 0 marks the
    // seed stale so the mount refetch walks the full set.
    mockGet.mockResolvedValue({ rows: page(30, 'fresh'), total: 30 })
    const seed = page(1, 'seed')
    const { result } = renderHook(() => useAdminPriceSubmissions(seed), {
      wrapper: withProvider(30 * 60 * 1000),
    })
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.data).toHaveLength(30))
  })

  it('errors when no auth token is available', async () => {
    mockGetToken.mockResolvedValue(null)
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockGet).not.toHaveBeenCalled()
  })
})
