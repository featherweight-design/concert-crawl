'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

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
 * Focus lands on the FIRST focusable element. In every current caller that is
 * either the cancel action or a required input (BulkDeleteConfirm's typed
 * token) — never the destructive confirm. That ordering is deliberate rather
 * than incidental: these dialogs guard irreversible work, so a stray Enter on
 * open must not commit it. A caller that puts its confirm first would break
 * that, which is worth knowing before rearranging a footer.
 */
export const useDialogKeyboard = (
  panelRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  { dismissible = true, enabled = true }: UseDialogKeyboardOptions = {},
): void => {
  useEffect(() => {
    if (!enabled) return
    const previouslyFocused = document.activeElement
    const focusable = (): HTMLElement[] =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      )

    focusable()[0]?.focus()

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        if (dismissible) onDismiss()
        return
      }
      if (evt.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      if (evt.shiftKey && document.activeElement === first) {
        evt.preventDefault()
        last.focus()
      } else if (!evt.shiftKey && document.activeElement === last) {
        evt.preventDefault()
        first.focus()
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
  }, [panelRef, onDismiss, dismissible, enabled])
}
