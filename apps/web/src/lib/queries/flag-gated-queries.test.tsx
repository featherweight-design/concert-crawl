// @vitest-environment jsdom
//
// The three signed-in queries that belong to a flagged feature. With the flag
// off the endpoint 404s, so the gate lives in the hook rather than at each
// mount site: `useCrewGoing` alone fires once per event row on Browse, and a
// component-level gate would still have spent every one of those requests.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => 'token',
    isSignedIn: true,
    userId: 'user_1',
  }),
}))

const apiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: { get: (path: string) => apiGet(path) },
}))

const fetchSpotifyConnection = vi.fn()
vi.mock('@/lib/spotify', () => ({
  fetchSpotifyConnection: () => fetchSpotifyConnection(),
  connectSpotify: vi.fn(),
  disconnectSpotify: vi.fn(),
  patchSpotifyConnection: vi.fn(),
  syncSpotifyConnection: vi.fn(),
}))

vi.mock('@/lib/crews', () => ({ setCrewMuted: vi.fn() }))

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

import { useCrewGoing } from './use-crew-going'
import { useCrews } from './use-crew-mutes'
import { useSpotifyConnection } from './use-spotify-connection'

const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

beforeEach(() => {
  apiGet.mockReset()
  apiGet.mockResolvedValue({ count: 0, going: [], crews: [] })
  fetchSpotifyConnection.mockReset()
  fetchSpotifyConnection.mockResolvedValue({ status: 'disconnected' })
  useFeatureFlag.mockReset()
})

const setFlag = (enabled: boolean) =>
  useFeatureFlag.mockReturnValue({ isLoading: false, enabled })

describe('flag-gated queries', () => {
  it('does not fetch the crew going line with crews off', async () => {
    setFlag(false)
    renderHook(() => useCrewGoing('evt-1'), { wrapper: wrapper() })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('fetches the crew going line with crews on', async () => {
    setFlag(true)
    renderHook(() => useCrewGoing('evt-1'), { wrapper: wrapper() })
    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith('/v1/crews/event-going/evt-1'),
    )
  })

  it('does not fetch the crew list with crews off', async () => {
    setFlag(false)
    renderHook(() => useCrews(), { wrapper: wrapper() })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('fetches the crew list with crews on', async () => {
    setFlag(true)
    renderHook(() => useCrews(), { wrapper: wrapper() })
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/v1/crews'))
  })

  it('does not fetch the Spotify connection with spotify-sync off', async () => {
    setFlag(false)
    renderHook(() => useSpotifyConnection(), { wrapper: wrapper() })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchSpotifyConnection).not.toHaveBeenCalled()
  })

  it('fetches the Spotify connection with spotify-sync on', async () => {
    setFlag(true)
    renderHook(() => useSpotifyConnection(), { wrapper: wrapper() })
    await waitFor(() => expect(fetchSpotifyConnection).toHaveBeenCalled())
  })
})
