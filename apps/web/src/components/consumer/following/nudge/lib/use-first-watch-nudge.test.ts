// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal shape of the mutation-cache 'updated' notification the hook listens
// for, mirroring the shipped FollowNudgeGate harness.
interface CacheEvent {
  type: string
  mutation: { options: { mutationKey?: readonly unknown[] }; state?: unknown }
  action: { type: string; data?: unknown }
}

type CacheListener = (event: CacheEvent) => void
let cacheListeners: CacheListener[]
const emit = (event: CacheEvent) => {
  for (const listener of cacheListeners) listener(event)
}

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getMutationCache: () => ({
      subscribe: (listener: CacheListener) => {
        cacheListeners.push(listener)
        return () => {
          cacheListeners = cacheListeners.filter((fn) => fn !== listener)
        }
      },
    }),
  }),
}))

let signedIn: boolean
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: signedIn }),
}))

import { useFirstWatchNudge } from './use-first-watch-nudge'

const watchOn = (
  overrides: {
    eventId?: string
    userEventId?: string | null
    artist?: string | null
    artistSlug?: string | null
  } = {},
): CacheEvent => ({
  type: 'updated',
  mutation: {
    options: { mutationKey: ['watch-toggle'] },
    state: { variables: overrides.eventId ?? 'evt-1' },
  },
  action: {
    type: 'success',
    data: {
      watching: true,
      savedPrice: null,
      userEventId:
        overrides.userEventId === undefined ? 'ue-1' : overrides.userEventId,
      artist: overrides.artist === undefined ? 'Big Thief' : overrides.artist,
      artistSlug:
        overrides.artistSlug === undefined ? 'big-thief' : overrides.artistSlug,
    },
  },
})

beforeEach(() => {
  localStorage.clear()
  cacheListeners = []
  signedIn = true
})

describe('useFirstWatchNudge', () => {
  it('offers the nudge on a successful watch', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    expect(result.current.target).toBeNull()
    act(() => emit(watchOn()))
    expect(result.current.target).toEqual({
      eventId: 'evt-1',
      userEventId: 'ue-1',
      artist: 'Big Thief',
      artistSlug: 'big-thief',
    })
  })

  it('ignores an un-watch, another mutation and a non-success update', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => {
      emit({
        type: 'updated',
        mutation: { options: { mutationKey: ['watch-toggle'] } },
        action: {
          type: 'success',
          data: {
            watching: false,
            savedPrice: null,
            userEventId: null,
            artist: null,
            artistSlug: null,
          },
        },
      })
      emit({
        type: 'updated',
        mutation: { options: { mutationKey: ['something-else'] } },
        action: { type: 'success', data: watchOn().action.data },
      })
      emit({
        type: 'updated',
        mutation: { options: { mutationKey: ['watch-toggle'] } },
        action: { type: 'error' },
      })
    })
    expect(result.current.target).toBeNull()
  })

  // No slug means the artists projection has no row, so there is nothing to
  // follow. Offering the card anyway would be a dead control.
  it('stays quiet when the artist has no page to follow', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => emit(watchOn({ artistSlug: null })))
    expect(result.current.target).toBeNull()
  })

  it('stays quiet for a signed-out visitor', () => {
    signedIn = false
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => emit(watchOn()))
    expect(result.current.target).toBeNull()
  })

  it('closes and stays closed once answered', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => emit(watchOn()))
    act(() => result.current.answer())
    expect(result.current.target).toBeNull()
    act(() => emit(watchOn()))
    expect(result.current.target).toBeNull()
  })

  // ⚠️ REGRESSION (#70 class). Un-watching deletes the watch row, so
  // re-watching arrives with a NEW userEventId and the nudge is owed again.
  // Keyed on eventId this assertion is the one that fails.
  it('returns after un-watch then re-watch, which mints a new row id', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => emit(watchOn({ userEventId: 'ue-1' })))
    act(() => result.current.answer())
    expect(result.current.target).toBeNull()

    // Same event, new watch row — exactly what the API returns after the user
    // un-watched and watched again.
    act(() => emit(watchOn({ userEventId: 'ue-2' })))
    expect(result.current.target?.userEventId).toBe('ue-2')
  })

  // The deliberate exception: a user who is also attending keeps the same row
  // through an un-watch, so their answer legitimately stands.
  it('stays closed when the re-watch lands on the same row id', () => {
    const { result } = renderHook(() => useFirstWatchNudge())
    act(() => emit(watchOn({ userEventId: 'ue-1' })))
    act(() => result.current.answer())
    act(() => emit(watchOn({ userEventId: 'ue-1' })))
    expect(result.current.target).toBeNull()
  })

  describe('disabled', () => {
    it('takes no watch at all', () => {
      const { result } = renderHook(() => useFirstWatchNudge(undefined, false))
      act(() => emit(watchOn()))
      expect(result.current.target).toBeNull()
    })

    // ⚠️ A target captured while enabled must not survive being switched off,
    // or the floating gate would hold a watch taken on event detail and float
    // it the moment the user navigated back to browse.
    it('drops a target it was already holding', () => {
      const { result, rerender } = renderHook(
        ({ on }: { on: boolean }) => useFirstWatchNudge(undefined, on),
        { initialProps: { on: true } },
      )
      act(() => emit(watchOn()))
      expect(result.current.target).not.toBeNull()
      rerender({ on: false })
      expect(result.current.target).toBeNull()
    })
  })

  describe('scoped to one event', () => {
    it('offers the nudge for its own event', () => {
      const { result } = renderHook(() => useFirstWatchNudge('evt-1'))
      act(() => emit(watchOn({ eventId: 'evt-1' })))
      expect(result.current.target?.eventId).toBe('evt-1')
    })

    it('ignores a watch on any other event', () => {
      const { result } = renderHook(() => useFirstWatchNudge('evt-1'))
      act(() => emit(watchOn({ eventId: 'evt-2' })))
      expect(result.current.target).toBeNull()
    })
  })
})
