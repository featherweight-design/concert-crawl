// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useReleaseReadState } from './useReleaseReadState'

const VERSION = 'v0.5.0-beta'

afterEach(() => {
  localStorage.clear()
})

describe('useReleaseReadState', () => {
  it('starts unread when localStorage is empty', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(true)
  })

  it('starts read when lastSeen matches latestVersion', () => {
    localStorage.setItem('cc.lastSeenRelease', VERSION)
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(false)
  })

  it('markSeen sets unread=false and writes to localStorage', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.unread).toBe(true)
    act(() => result.current.markSeen())
    expect(result.current.unread).toBe(false)
    expect(localStorage.getItem('cc.lastSeenRelease')).toBe(VERSION)
  })

  it('pillDismissed starts false', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.pillDismissed).toBe(false)
  })

  it('dismissPill sets pillDismissed=true and writes to localStorage', () => {
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    act(() => result.current.dismissPill())
    expect(result.current.pillDismissed).toBe(true)
    const stored = JSON.parse(
      localStorage.getItem('cc.dismissedSpotlights') ?? '[]',
    ) as string[]
    expect(stored).toContain(VERSION)
  })

  it('pillDismissed starts true if version already in dismissedSpotlights', () => {
    localStorage.setItem('cc.dismissedSpotlights', JSON.stringify([VERSION]))
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    expect(result.current.pillDismissed).toBe(true)
  })

  it('dismissPill preserves other dismissed versions', () => {
    localStorage.setItem(
      'cc.dismissedSpotlights',
      JSON.stringify(['v0.4.0-beta']),
    )
    const { result } = renderHook(() => useReleaseReadState(VERSION))
    act(() => result.current.dismissPill())
    const stored = JSON.parse(
      localStorage.getItem('cc.dismissedSpotlights') ?? '[]',
    ) as string[]
    expect(stored).toContain('v0.4.0-beta')
    expect(stored).toContain(VERSION)
  })
})
