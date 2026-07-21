// @vitest-environment jsdom

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DiscoveryLoadingShelf } from './DiscoveryLoadingShelf'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.discovery.loading

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DiscoveryLoadingShelf', () => {
  it('renders the shimmering skeleton row with the loading eyebrow initially', () => {
    render(<DiscoveryLoadingShelf onRetry={vi.fn()} />)

    expect(screen.getByRole('status', { name: COPY.ariaLabel })).toBeTruthy()
    expect(screen.getByText(SPOTIFY_COPY.discovery.title)).toBeTruthy()
    expect(screen.getByText(COPY.eyebrow)).toBeTruthy()
    // The timeout chip is NOT rendered pre-timeout.
    expect(screen.queryByText(COPY.timeout.eyebrow)).toBeNull()
    expect(
      screen.queryByRole('button', { name: COPY.timeout.retryCta }),
    ).toBeNull()
  })

  it('flips to the timeout chip after the configured timeout', () => {
    render(<DiscoveryLoadingShelf onRetry={vi.fn()} timeoutMs={100} />)

    // Pre-timeout: shimmering shelf, no retry.
    expect(screen.getByText(COPY.eyebrow)).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Post-timeout: eyebrow flips, chip + retry button appear.
    expect(screen.getByText(COPY.eyebrowTimeout)).toBeTruthy()
    expect(screen.getByText(COPY.timeout.eyebrow)).toBeTruthy()
    expect(screen.getByText(COPY.timeout.title)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: COPY.timeout.retryCta }),
    ).toBeTruthy()
  })

  it('invokes onRetry and returns to the shimmer state when Retry is clicked', () => {
    const onRetry = vi.fn()
    render(<DiscoveryLoadingShelf onRetry={onRetry} timeoutMs={100} />)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    const retryButton = screen.getByRole('button', {
      name: COPY.timeout.retryCta,
    })
    fireEvent.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
    // After retry, the shelf is back in the initial loading state.
    expect(screen.getByText(COPY.eyebrow)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: COPY.timeout.retryCta }),
    ).toBeNull()
  })

  it('does not fire onRetry if unmounted before the timeout', () => {
    const onRetry = vi.fn()
    const { unmount } = render(
      <DiscoveryLoadingShelf onRetry={onRetry} timeoutMs={100} />,
    )
    unmount()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onRetry).not.toHaveBeenCalled()
  })
})
