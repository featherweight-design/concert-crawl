// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

const EVENT_ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01'

let searchParams = new URLSearchParams()
const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/events/e1',
  useRouter: () => ({ replace }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => <a href={href}>{children}</a>,
}))

const watchingData = vi.fn<() => unknown[] | undefined>(() => [])
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: watchingData() }),
}))

const mutate = vi.fn()
vi.mock('@/lib/queries/use-watch-toggle', () => ({
  useWatchToggle: () => ({ mutate }),
}))

import { ReturnSeamReplay } from './ReturnSeamReplay'

beforeEach(() => {
  vi.useFakeTimers()
  searchParams = new URLSearchParams()
  replace.mockClear()
  mutate.mockClear()
  watchingData.mockReturnValue([])
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const withIntent = (raw: string, label?: string) => {
  searchParams = new URLSearchParams({ intent: raw })
  if (label) searchParams.set('label', label)
}

describe('ReturnSeamReplay — replaying a pre-account action (#794)', () => {
  it('does nothing at all when there is no intent', () => {
    render(<ReturnSeamReplay />)
    expect(mutate).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('replays the watch and confirms it', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<ReturnSeamReplay />)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0]![0]).toBe(EVENT_ID)
    expect(screen.getByRole('status').textContent).toContain(
      'Now watching Geese.',
    )
  })

  it('fires exactly once — the endpoint is a toggle, so a second run un-watches', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    const { rerender } = render(<ReturnSeamReplay />)
    rerender(<ReturnSeamReplay />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('strips the params so a refresh or a share cannot replay it', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<ReturnSeamReplay />)
    expect(replace).toHaveBeenCalledWith('/events/e1')
  })

  it('strips a malformed intent too, without calling the endpoint', () => {
    withIntent('watch:not-a-uuid', 'Geese')
    render(<ReturnSeamReplay />)
    expect(replace).toHaveBeenCalledWith('/events/e1')
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('leaves an already-watched show alone but still confirms', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    watchingData.mockReturnValue([{ eventId: EVENT_ID }])
    render(<ReturnSeamReplay />)
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain(
      'Now watching Geese.',
    )
  })

  it('claims nothing when the replay fails', () => {
    // Sold out, unlinked, or deleted mid-flow — the visitor still lands on the
    // destination, but no strip says something happened that did not.
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mutate.mockImplementation((_id, opts) => opts.onError(new Error('gone')))
    render(<ReturnSeamReplay />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('waits for the watching list before firing — a cold cache reads as not-watching', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    watchingData.mockReturnValue(undefined)
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    const { rerender } = render(<ReturnSeamReplay />)
    // Firing here would toggle an already-watched show off.
    expect(mutate).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()

    watchingData.mockReturnValue([])
    rerender(<ReturnSeamReplay />)
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('keeps the strip after the params it was built from are gone', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    const { rerender } = render(<ReturnSeamReplay />)
    // The real router.replace lands the component on a param-free URL.
    searchParams = new URLSearchParams()
    rerender(<ReturnSeamReplay />)
    expect(screen.getByRole('status').textContent).toContain(
      'Now watching Geese.',
    )
  })

  it("leaves the destination's own query params in place", () => {
    searchParams = new URLSearchParams({
      tab: 'prices',
      intent: `watch:${EVENT_ID}`,
      label: 'Geese',
    })
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<ReturnSeamReplay />)
    expect(replace).toHaveBeenCalledWith('/events/e1?tab=prices')
    // The strip's own link points where the visitor actually is.
    expect(
      screen.getByRole('status').querySelector('a')?.getAttribute('href'),
    ).toBe('/events/e1?tab=prices')
  })

  it("keeps the destination's fragment when it strips the params", () => {
    window.location.hash = '#lineup'
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<ReturnSeamReplay />)
    expect(replace).toHaveBeenCalledWith('/events/e1#lineup')
    window.location.hash = ''
  })

  it('starts clean on a second intent — a past failure must not mute the next', () => {
    const OTHER_ID = '7c2b4e91-3a5d-4f68-8b1c-2d9e0f3a4b56'
    withIntent(`watch:${EVENT_ID}`, 'Geese')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mutate.mockImplementation((_id, opts) => opts.onError(new Error('gone')))
    const { rerender } = render(<ReturnSeamReplay />)
    expect(screen.queryByRole('status')).toBeNull()

    // Same session, a different show, this time it works.
    withIntent(`watch:${OTHER_ID}`, 'Ratboys')
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    rerender(<ReturnSeamReplay />)
    expect(screen.getByRole('status').textContent).toContain(
      'Now watching Ratboys.',
    )
  })

  it('renders no strip when the label is missing — it cannot name the show', () => {
    withIntent(`watch:${EVENT_ID}`)
    mutate.mockImplementation((_id, opts) => opts.onSuccess())
    render(<ReturnSeamReplay />)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
