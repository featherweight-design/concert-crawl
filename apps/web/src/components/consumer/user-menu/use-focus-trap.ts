'use client'

import { useEffect } from 'react'

// Kept identical to BottomSheet's selector so the two traps can't drift.
// :not(:disabled) excludes native controls that can't actually receive focus —
// otherwise a disabled control at either end makes the trap refuse to wrap.
const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Moves focus into `ref` when `active` turns true and keeps Tab cycling inside
 * it. Focus lands on the container itself (tabIndex -1), not the first row, so
 * the first Tab press reaches the menu's primary action — this is the one
 * deliberate difference from BottomSheet, which focuses its first control.
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return
    const surface = ref.current
    if (!surface) return
    surface.focus()

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Tab') return
      const focusable = Array.from(
        surface.querySelectorAll<HTMLElement>(FOCUSABLE),
      )
      if (focusable.length === 0) {
        // Nothing to cycle through: hold Tab on the container so a keyboard
        // user can't step behind an aria-modal surface.
        ev.preventDefault()
        surface.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeEl = document.activeElement
      // Focus outside the surface entirely — it never entered, or something
      // moved it programmatically. Tab from there would escape the modal.
      if (!surface.contains(activeEl)) {
        ev.preventDefault()
        if (ev.shiftKey) {
          last?.focus()
        } else {
          first?.focus()
        }
        return
      }
      if (ev.shiftKey && (activeEl === first || activeEl === surface)) {
        ev.preventDefault()
        last?.focus()
      } else if (!ev.shiftKey && activeEl === last) {
        ev.preventDefault()
        first?.focus()
      }
    }

    // Document-level, not surface-level: a surface listener never fires once
    // focus has left the surface, which is exactly when the trap is needed.
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, ref])
}
