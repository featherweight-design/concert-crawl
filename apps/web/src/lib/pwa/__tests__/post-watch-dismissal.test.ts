// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasDismissedPostWatchAsk,
  markPostWatchAskDismissed,
} from '../post-watch-dismissal'

beforeEach(() => {
  localStorage.clear()
})

describe('post-watch-dismissal', () => {
  it('starts false with no record', () => {
    expect(hasDismissedPostWatchAsk()).toBe(false)
  })

  it('persists true after markPostWatchAskDismissed', () => {
    markPostWatchAskDismissed()
    expect(hasDismissedPostWatchAsk()).toBe(true)
  })

  it('idempotent — repeated calls stay true', () => {
    markPostWatchAskDismissed()
    markPostWatchAskDismissed()
    expect(hasDismissedPostWatchAsk()).toBe(true)
  })

  it('returns false if the flag is any value other than "1"', () => {
    // Guards against a future format change accidentally re-enabling the
    // sheet for existing users — only the canonical "1" counts.
    localStorage.setItem('cc-push-postwatch-dismissed', 'true')
    expect(hasDismissedPostWatchAsk()).toBe(false)
  })

  it('returns false when localStorage access throws', () => {
    // Simulate Safari private mode / restricted iframe. The read wraps
    // localStorage access itself so this doesn't bubble.
    //
    // In jsdom, `localStorage` is inherited from the prototype chain, so
    // getOwnPropertyDescriptor(window, 'localStorage') returns undefined.
    // Always restore in a finally block: reinstate the original descriptor
    // when one exists, otherwise delete the own-property override so the
    // inherited getter takes over again. Without this, the throwing getter
    // leaks into later tests and breaks the next beforeEach's clear().
    const originalGet = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage disabled')
      },
    })
    try {
      expect(hasDismissedPostWatchAsk()).toBe(false)
    } finally {
      if (originalGet) {
        Object.defineProperty(window, 'localStorage', originalGet)
      } else {
        // No own descriptor to restore — remove the override so the
        // inherited getter serves subsequent access. Reflect.deleteProperty
        // sidesteps the `as` cast the `delete` operator would need.
        Reflect.deleteProperty(window, 'localStorage')
      }
    }
  })

  it('catches and warns instead of throwing when localStorage.setItem fails', () => {
    // Simulate quota-exceeded. markPostWatchAskDismissed catches and warns
    // instead of bubbling to the click handler.
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
    expect(() => markPostWatchAskDismissed()).not.toThrow()
    spy.mockRestore()
  })
})
