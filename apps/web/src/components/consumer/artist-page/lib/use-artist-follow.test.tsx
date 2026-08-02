// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useArtistFollow } from './use-artist-follow'

const getToken = vi.fn(async () => 'token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, isSignedIn: true }),
}))

const post = vi.fn()
const del = vi.fn()
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('useArtistFollow', () => {
  it('flips immediately and keeps the server answer', async () => {
    post.mockResolvedValue({ following: true })
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false))

    act(() => {
      result.current.toggle()
    })
    // Optimistic: the flip lands in the same tick as the click, before the
    // request resolves.
    expect(result.current.following).toBe(true)

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0]?.[0]).toBe('/v1/artists/wax-harbour/follow')
    expect(result.current.following).toBe(true)
  })

  it('rolls back when the request is rejected', async () => {
    post.mockRejectedValue(new Error('nope'))
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false))

    act(() => {
      result.current.toggle()
    })
    expect(result.current.following).toBe(true)

    await waitFor(() => expect(result.current.following).toBe(false))
  })

  it('rolls back when a 2xx body has an unreadable shape', async () => {
    // A success we cannot parse is not a success — keeping the optimistic
    // guess would strand the UI out of sync with the server.
    post.mockResolvedValue({ ok: 'sure' })
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false))

    act(() => {
      result.current.toggle()
    })
    expect(result.current.following).toBe(true)

    await waitFor(() => expect(result.current.following).toBe(false))
  })

  it('takes the server state when it disagrees with the optimistic flip', async () => {
    // Unfollowing a Spotify-sourced artist leaves the follow standing — the
    // API returns the EFFECTIVE state, and that is what we must render.
    del.mockResolvedValue({ following: true })
    const { result } = renderHook(() => useArtistFollow('wax-harbour', true))

    act(() => {
      result.current.toggle()
    })
    expect(result.current.following).toBe(false)

    await waitFor(() => expect(result.current.following).toBe(true))
    expect(del).toHaveBeenCalledWith('/v1/artists/wax-harbour/follow', 'token')
  })

  it('ignores a second click while one is in flight', async () => {
    post.mockResolvedValue({ following: true })
    const { result } = renderHook(() => useArtistFollow('wax-harbour', false))

    act(() => {
      result.current.toggle()
      result.current.toggle()
    })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(del).not.toHaveBeenCalled()
  })
})
