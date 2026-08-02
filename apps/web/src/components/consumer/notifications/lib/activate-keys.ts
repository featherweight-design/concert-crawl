// Keyboard activation for the panel's `role="button"` rows (#737).
//
// Extracted from NotifItem so every faux-button in this feature — the panel
// row, the inbox strip's collapsed row, the menu notification row, the
// `‹ Menu` back row — shares ONE handler rather than four near-copies that
// drift. A `role="button"` that only answers Enter is a keyboard trap for
// anyone who reaches for Space, which is what a native button answers.
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
