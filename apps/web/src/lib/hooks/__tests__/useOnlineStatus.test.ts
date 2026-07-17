// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useOnlineStatus } from '../useOnlineStatus'

describe('useOnlineStatus', () => {
  it('reflects offline/online events', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })
})
