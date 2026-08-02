// Keyboard activation for the panel's `role="button"` rows (#737).
//
// Every row that CAN be a native `<button>` is one. This handler exists for the
// one that cannot: NotifItem, whose interactivity is conditional on `onOpen`,
// so it renders as a plain non-focusable row when no handler is supplied and a
// button-like row when one is. A `role="button"` that only answers Enter is a
// keyboard trap for anyone who reaches for Space, which is what a native
// button answers — so the fallback has to cover both keys.
//
// preventDefault runs on EVERY repeat, or holding Space scrolls the page out
// from under the panel. Activation deliberately does not: keydown auto-repeats,
// and a held key would otherwise fire one read mutation and one navigation per
// tick.

import type { KeyboardEvent } from 'react'

export const activateOnKey =
  (activate: () => void) =>
  (event: KeyboardEvent<Element>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (event.repeat) return
    activate()
  }
