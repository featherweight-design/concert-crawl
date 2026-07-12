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
  eventTitle: 'Show',
  eventDate: null,
  ticketUrl: null,
  venueName: null,
})

const page = (count: number, prefix: string): PriceSubmissionHistoryRow[] =>
  Array.from({ length: count }, (_, idx) => stubRow(`${prefix}-${idx}`))

const offsetOf = (url: string): number =>
  Number(new URLSearchParams(url.split('?')[1]).get('offset'))

const withProvider = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
    // 150 total: first page full (100), second page partial (50).
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        offsetOf(url) === 0
          ? { rows: page(100, 'p0'), total: 150 }
          : { rows: page(50, 'p100'), total: 150 },
      ),
    )
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toHaveLength(150))
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet.mock.calls[1]?.[0]).toContain('offset=100')
  })

  it('stops early if a page returns no rows despite a larger reported total', async () => {
    // Defensive: a stale/racey total must not spin the loop forever.
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        offsetOf(url) === 0
          ? { rows: page(100, 'p0'), total: 500 }
          : { rows: [], total: 500 },
      ),
    )
    const { result } = renderHook(() => useAdminPriceSubmissions(), {
      wrapper: withProvider(),
    })
    await waitFor(() => expect(result.current.data).toHaveLength(100))
    expect(mockGet).toHaveBeenCalledTimes(2)
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
