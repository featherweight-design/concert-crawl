'use client'

import { useEffect, useRef, type RefObject } from 'react'

// `:not([disabled])` is load-bearing, not tidiness. A disabled button cannot
// take focus, so counting one as a trap member breaks the trap twice over:
// the opening `.focus()` silently no-ops, and a disabled element as the tail
// means the Tab-wrap comparison never matches and Tab leaves the dialog. Four
// callers disable BOTH footer buttons while pending, and BulkDeleteConfirm
// disables its confirm until the token is typed — the state it is in for most
// of its life.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface UseDialogKeyboardOptions {
  /**
   * False while the dialog is not on screen. Callers that render their panel
   * inline behind an `open` flag need this: an unconditional hook would keep
   * a document-level Escape listener attached whenever the component is
   * mounted, so Escape anywhere on the page would fire the dialog's dismiss.
   * Callers whose panel is its own component, mounted only when open, can
   * leave it alone.
   */
  enabled?: boolean
  /**
   * When false, Escape is inert. Callers pass their pending flag here: a
   * dialog mid-request has already committed, so dismissing it would leave
   * the admin believing they cancelled something that is still running.
   * Focus containment stays on either way — the background is still inert.
   */
  dismissible?: boolean
}

/**
 * Escape, focus containment and focus restore for a hand-rolled modal.
 *
 * `aria-modal="true"` is a claim that the background is inert. Without this
 * the claim is false: focus stays wherever it was when the dialog mounted,
 * Tab walks straight back out into the page behind it, and Escape does
 * nothing. Assistive technology is told one thing and the keyboard does
 * another.
 *
 * Split from AdminDialog so a modal that cannot use the shared chrome —
 * MergeEventDialog is a search-and-pick flow, not a confirmation — still gets
 * the behaviour rather than reimplementing it or going without.
 *
 * Focus lands on the first ENABLED focusable element, or on the panel itself
 * when a caller has disabled everything. Note that "first" is whatever the
 * caller renders first, and that is not always an inert control:
 * StagedApplyConfirm leads with a "trigger recrawl" checkbox, so focus opens
 * on a toggle. No current caller opens on its destructive confirm, which
 * matters because these dialogs guard irreversible work — but this hook
 * cannot enforce that, so it is a thing to re-check when reordering a panel.
 */
export const useDialogKeyboard = (
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  { dismissible = true, enabled = true }: UseDialogKeyboardOptions = {},
): void => {
  // Held in a ref so the effect does not depend on the callback's identity.
  // Callers routinely pass a plain function declaration or an inline arrow —
  // DeleteVenueConfirm's `handleClose` is redeclared every render — and with
  // `onDismiss` in the dep array the effect tore down and rebuilt on every
  // keystroke, blurring to the opener and refocusing the input each time.
  // That cancels IME composition mid-word.
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!enabled) return
    const previouslyFocused = document.activeElement
    const focusable = (): HTMLElement[] =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      )

    const opening = focusable()[0]
    if (opening) opening.focus()
    else if (panelRef.current) {
      // Everything is disabled — mid-request, usually. Focus the panel so it
      // never sits outside a dialog that still claims the page is inert.
      panelRef.current.tabIndex = -1
      panelRef.current.focus()
    }

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        if (dismissible) dismissRef.current()
        return
      }
      if (evt.key !== 'Tab') return
      const items = focusable()
      const head = items[0]
      const tail = items[items.length - 1]
      if (!head || !tail) {
        // Nothing focusable left to cycle between; keep Tab inside anyway.
        evt.preventDefault()
        return
      }
      if (evt.shiftKey && document.activeElement === head) {
        evt.preventDefault()
        tail.focus()
      } else if (!evt.shiftKey && document.activeElement === tail) {
        evt.preventDefault()
        head.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Returning focus to the control that opened the dialog is the other
      // half of the contract: without it focus falls back to <body> and a
      // keyboard user restarts their traversal from the top of the page.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [panelRef, dismissible, enabled])
}
