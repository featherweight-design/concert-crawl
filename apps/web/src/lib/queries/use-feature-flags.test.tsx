// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ publicApiClient: { get } }))

const { useFeatureFlag, useFeatureFlags } = await import('./use-feature-flags')

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useFeatureFlags', () => {
  it('returns the flag map from the public endpoint', async () => {
    get.mockResolvedValue({
      'spotify-sync': false,
      crews: true,
      'release-notes': true,
    })
    const { result } = renderHook(() => useFeatureFlags(), { wrapper })
    await waitFor(() => expect(result.current.data?.crews).toBe(true))
    expect(get).toHaveBeenCalledWith('/v1/flags')
  })

  it('serves the registry default while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeatureFlag('crews'), { wrapper })
    expect(result.current).toEqual({ isLoading: true, enabled: false })
  })

  // Same in-flight state, opposite default: a released feature must not blink
  // out between first paint and the flag map landing.
  it('keeps a default-on flag on while the fetch is in flight', async () => {
    get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    })
    expect(result.current).toEqual({ isLoading: true, enabled: true })
  })

  it('falls back to registry defaults when the fetch fails', async () => {
    get.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useFeatureFlag('release-notes'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.enabled).toBe(true)
  })

  // apps/web has no zod, so the boundary is narrowed with a hand-written guard
  // (same approach as use-event-watchers). A malformed map must not be able to
  // turn a default-off flag on.
  it('rejects a malformed flag map and keeps the registry defaults', async () => {
    get.mockResolvedValue({ crews: 'yes' })
    const { result } = renderHook(() => useFeatureFlag('crews'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.enabled).toBe(false)
  })
})
