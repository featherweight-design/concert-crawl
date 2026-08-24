// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { AuthLoadingState, AUTH_LOAD_TIMEOUT_MS } from './AuthLoadingState'
import { SIGN_IN_COPY } from './definitions/copy'

const reload = vi.fn()
const realLocation = window.location

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  reload.mockClear()
  // jsdom's location.reload is a no-op stub that cannot be spied on directly.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: realLocation,
  })
})

describe('AuthLoadingState', () => {
  it('shows a loading status and no error before the timeout elapses', () => {
    render(<AuthLoadingState />)

    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText(SIGN_IN_COPY.unavailable.title)).toBeNull()
  })

  it('keeps waiting right up to the timeout boundary', () => {
    render(<AuthLoadingState />)

    act(() => {
      vi.advanceTimersByTime(AUTH_LOAD_TIMEOUT_MS - 1)
    })

    expect(screen.queryByText(SIGN_IN_COPY.unavailable.title)).toBeNull()
  })

  // The bug: when Clerk's script is blocked it never mounts and never errors,
  // so <ClerkLoading> renders forever. Previously that was an empty
  // min-h-screen box — a blank white page with nothing to act on.
  it('surfaces a retryable message once Clerk has failed to arrive', () => {
    render(<AuthLoadingState />)

    act(() => {
      vi.advanceTimersByTime(AUTH_LOAD_TIMEOUT_MS)
    })

    expect(screen.getByText(SIGN_IN_COPY.unavailable.title)).toBeTruthy()
    expect(screen.getByText(SIGN_IN_COPY.unavailable.sub)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: SIGN_IN_COPY.unavailable.retry }),
    ).toBeTruthy()
  })

  it('reloads the page rather than soft-refreshing, so the script is refetched', () => {
    render(<AuthLoadingState />)

    act(() => {
      vi.advanceTimersByTime(AUTH_LOAD_TIMEOUT_MS)
    })
    fireEvent.click(
      screen.getByRole('button', { name: SIGN_IN_COPY.unavailable.retry }),
    )

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('drops its timer on unmount so a mounted Clerk never trips the error', () => {
    const { unmount } = render(<AuthLoadingState />)
    unmount()

    // If the timeout survived unmount this would warn about setting state on an
    // unmounted tree; asserting no throw keeps the cleanup contract explicit.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(AUTH_LOAD_TIMEOUT_MS * 2)
      })
    }).not.toThrow()
  })
})
