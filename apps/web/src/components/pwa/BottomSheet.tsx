'use client'

import { useEffect, useId, useRef } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  /** Rendered as an sr-only heading and used as aria-labelledby target. */
  title: string
  children: React.ReactNode
}

// :not(:disabled) excludes native controls that can't actually receive focus
// (disabled button/input/select/textarea) — otherwise the focus trap sees them
// as focusables and refuses to wrap when they're at either end of the list.
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export const BottomSheet = ({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    previousFocus.current = document.activeElement
    const first =
      sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    if (first) {
      first.focus()
    } else {
      // No focusable children — focus the dialog container itself so screen
      // readers and keyboard nav don't stay behind the modal. The container
      // has tabIndex={-1} so it can accept programmatic focus.
      sheetRef.current?.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const focusables = sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) {
        // No focusables inside → trap Tab on the container itself so keyboard
        // users can't escape a modal that has no actionable content.
        event.preventDefault()
        sheet.focus()
        return
      }
      const firstFocusable = focusables[0]
      const lastFocusable = focusables[focusables.length - 1]
      // If focus is anywhere outside the dialog (never entered, or moved
      // programmatically) Tab would let the user escape the modal — force
      // focus back to the first (or last, on Shift+Tab) focusable inside.
      if (!sheet.contains(document.activeElement)) {
        event.preventDefault()
        if (event.shiftKey) {
          lastFocusable?.focus()
        } else {
          firstFocusable?.focus()
        }
        return
      }
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // tabIndex=-1 lets the container accept programmatic focus as the
        // fallback for the zero-focusable-children case (see focus handling
        // in the useEffect above).
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface-1 p-6 shadow-2xl focus:outline-none"
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
