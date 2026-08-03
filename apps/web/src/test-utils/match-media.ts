// jsdom ships no matchMedia, so anything reading useIsMobileViewport (or any
// other media-query hook) needs it stubbed. Returns a setter that flips the
// viewport and notifies live listeners, so a test can change it after mount and
// not just between renders.

import { vi } from 'vitest'

// `matches` is the only field a change listener reads, so the stub emits that
// shape rather than a full MediaQueryListEvent it would have to fake with a
// cast.
type ChangeListener = (ev: { matches: boolean }) => void

export const stubMatchMedia = (initialMatches = false) => {
  let matches = initialMatches
  // Every list this stub hands out, so a flip reaches hooks that already
  // subscribed. Without it the setter changes `matches` and nothing re-renders,
  // which reads as a passing test rather than a missing update.
  const listeners = new Set<ChangeListener>()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      onchange: null,
      addListener: (fn: ChangeListener) => listeners.add(fn),
      removeListener: (fn: ChangeListener) => listeners.delete(fn),
      addEventListener: (_name: string, fn: ChangeListener) =>
        listeners.add(fn),
      removeEventListener: (_name: string, fn: ChangeListener) =>
        listeners.delete(fn),
      dispatchEvent: vi.fn(),
    })),
  })

  return (next: boolean) => {
    if (next === matches) return
    matches = next
    for (const fn of listeners) {
      fn({ matches: next })
    }
  }
}
