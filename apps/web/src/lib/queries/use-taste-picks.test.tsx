// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { SpotifyTastePicksResponse } from '@concert-crawl/types'

interface AuthState {
  getToken: () => Promise<string | null>
  isSignedIn: boolean
  userId: string | null
}

let auth: AuthState

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => auth,
}))

const fetchTastePicks =
  vi.fn<(token: string) => Promise<SpotifyTastePicksResponse>>()

vi.mock('@/lib/spotify', () => ({
  fetchTastePicks: (token: string) => fetchTastePicks(token),
}))

import { useTastePicks, tastePicksQueryKey } from './use-taste-picks'

const SEED: SpotifyTastePicksResponse = {
  status: 'connected',
  picks: [],
}

const SERVER: SpotifyTastePicksResponse = {
  status: 'connected',
  picks: [
    {
      eventId: 'evt-1',
      artist: 'Turnstile',
      title: 'Turnstile',
      imageUrl: null,
      date: '2030-08-02',
      showTime: '20:00:00',
      ticketPriceMin: '39.00',
      venueName: 'Mission Ballroom',
      venueSlug: 'mission-ballroom',
      reason: { kind: 'top', rank: 4, artistName: 'Turnstile' },
    },
  ],
}

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

beforeEach(() => {
  auth = {
    getToken: async () => 'token',
    isSignedIn: true,
    userId: 'user_1',
  }
  fetchTastePicks.mockReset()
  fetchTastePicks.mockResolvedValue(SERVER)
})

describe('useTastePicks initialData seeding', () => {
  it('applies the seed synchronously once userId is known', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { result } = renderHook(() => useTastePicks(true, SEED), {
      wrapper: makeWrapper(client),
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.data).toEqual(SEED)
    expect(client.getQueryData(tastePicksQueryKey('user_1'))).toEqual(SEED)
  })

  it('does not apply the seed while userId is unresolved — the shared null key must never hold seeded picks', async () => {
    auth = { ...auth, userId: null }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const { result } = renderHook(() => useTastePicks(true, SEED), {
      wrapper: makeWrapper(client),
    })

    // No synchronous seed: the query starts pending and the null cache key
    // stays empty (a later session with a transiently-unresolved userId must
    // not read another user's SSR-seeded picks).
    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(client.getQueryData(tastePicksQueryKey(null))).toBeUndefined()

    // The query still resolves via the network fetch.
    await waitFor(() => expect(result.current.data).toEqual(SERVER))
  })

  it('applies the seed under the resolved userId once auth settles', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    auth = { ...auth, userId: null }
    const { result, rerender } = renderHook(() => useTastePicks(true, SEED), {
      wrapper: makeWrapper(client),
    })
    expect(result.current.data).toBeUndefined()

    auth = { ...auth, userId: 'user_2' }
    rerender()

    expect(result.current.data).toEqual(SEED)
    expect(client.getQueryData(tastePicksQueryKey('user_2'))).toEqual(SEED)
    // The null key never received the seed.
    expect(client.getQueryData(tastePicksQueryKey(null))).toBeUndefined()
  })
})
