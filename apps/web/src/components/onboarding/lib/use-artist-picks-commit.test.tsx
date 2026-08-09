// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlanState } from '@concert-crawl/types'

const followArtistsBulk =
  vi.fn<(token: string, slugs: readonly string[]) => Promise<void>>()
const fetchMe = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token', userId: 'user_1' }),
}))

vi.mock('@/lib/following', () => ({
  followArtistsBulk: (token: string, slugs: readonly string[]) =>
    followArtistsBulk(token, slugs),
}))

vi.mock('@/lib/users', () => ({
  fetchMe: (token: string) => fetchMe(token),
}))

import { ApiError } from '@/lib/api'
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history'
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  writePicks,
  readPicks,
} from '@/components/consumer/artist-picker'
import { useArtistPicksCommit } from './use-artist-picks-commit'

const PREMIUM: PlanState = {
  plan: 'premium',
  roleComped: false,
  status: 'active',
  onTrial: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

const FREE: PlanState = {
  plan: 'free',
  roleComped: false,
  status: null,
  onTrial: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
)

const entitlementError = () =>
  new ApiError(403, 'Premium required', ENTITLEMENT_REQUIRED_CODE)

beforeEach(() => {
  followArtistsBulk.mockReset()
  fetchMe.mockReset()
  window.sessionStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useArtistPicksCommit', () => {
  it('advances without a write when nothing is selected', () => {
    const onDone = vi.fn()
    writePicks(ARTIST_PICKS_KEY, ['stale'])
    writePicks(GENRE_PICKS_KEY, ['punk'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit([]))

    expect(followArtistsBulk).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
    // Skipping is a real outcome, so the mirror goes with it.
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([])
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([])
  })

  it('writes every pick in ONE request, then clears the mirror', async () => {
    const onDone = vi.fn()
    followArtistsBulk.mockResolvedValue(undefined)
    writePicks(ARTIST_PICKS_KEY, ['aa', 'bb'])
    writePicks(GENRE_PICKS_KEY, ['punk', 'metal'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit(['aa', 'bb']))

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(followArtistsBulk).toHaveBeenCalledTimes(1)
    expect(followArtistsBulk).toHaveBeenCalledWith('test-token', ['aa', 'bb'])
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([])
    // The lede promises the genres are not saved, so they cannot outlive the
    // step that used them as a filter.
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([])
  })

  it('opens the picker on a 403 and keeps the selection', async () => {
    const onDone = vi.fn()
    followArtistsBulk.mockRejectedValue(entitlementError())
    writePicks(ARTIST_PICKS_KEY, ['aa', 'bb'])
    writePicks(GENRE_PICKS_KEY, ['punk'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit(['aa', 'bb']))

    await waitFor(() => expect(result.current.pickerOpen).toBe(true))
    // The step holds — this is the one failure that has somewhere to send you.
    expect(onDone).not.toHaveBeenCalled()
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual(['aa', 'bb'])
    // An interrupted upgrade comes back to the grid it left, genres included.
    expect(readPicks(GENRE_PICKS_KEY)).toEqual(['punk'])
  })

  it('retries the same write when the picker closes on an active plan', async () => {
    const onDone = vi.fn()
    followArtistsBulk.mockRejectedValueOnce(entitlementError())
    followArtistsBulk.mockResolvedValueOnce(undefined)
    fetchMe.mockResolvedValue({ planState: PREMIUM })
    writePicks(GENRE_PICKS_KEY, ['punk'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit(['aa', 'bb']))
    await waitFor(() => expect(result.current.pickerOpen).toBe(true))

    act(() => result.current.closePicker())

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(followArtistsBulk).toHaveBeenNthCalledWith(2, 'test-token', [
      'aa',
      'bb',
    ])
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([])
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([])
  })

  it('does not retry blind when the upgrade did not land', async () => {
    const onDone = vi.fn()
    followArtistsBulk.mockRejectedValue(entitlementError())
    fetchMe.mockResolvedValue({ planState: FREE })
    writePicks(ARTIST_PICKS_KEY, ['aa'])
    writePicks(GENRE_PICKS_KEY, ['punk'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit(['aa']))
    await waitFor(() => expect(result.current.pickerOpen).toBe(true))

    act(() => result.current.closePicker())
    await waitFor(() => expect(result.current.pickerOpen).toBe(false))

    // A blind retry would 403 again and reopen the picker in a loop.
    expect(followArtistsBulk).toHaveBeenCalledTimes(1)
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual(['aa'])
    expect(readPicks(GENRE_PICKS_KEY)).toEqual(['punk'])
  })

  it('moves on when the write fails for any other reason', async () => {
    const onDone = vi.fn()
    followArtistsBulk.mockRejectedValue(new ApiError(500, 'Boom'))
    writePicks(ARTIST_PICKS_KEY, ['aa'])
    writePicks(GENRE_PICKS_KEY, ['punk'])
    const { result } = renderHook(() => useArtistPicksCommit(onDone), {
      wrapper,
    })

    act(() => result.current.commit(['aa']))

    // Onboarding may never become a wall.
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(result.current.pickerOpen).toBe(false)
    // The step is over either way, so neither mirror survives it.
    expect(readPicks(ARTIST_PICKS_KEY)).toEqual([])
    expect(readPicks(GENRE_PICKS_KEY)).toEqual([])
  })
})
