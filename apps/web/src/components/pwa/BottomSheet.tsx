'use client'

import { useEffect, useId, useRef } from 'react'
import { OVERLAY_COPY } from '@/components/ui/cc-overlay/definitions/copy'

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
    // z-[90] puts this in the dialog band alongside ModalShell's scrim. At the
    // old z-50 it sat *below* the persistent feedback edge tab (z-80), which
    // then drew over every sheet in the app and clipped controls inside it at
    // narrow widths. A focus-trapping dialog outranks standing chrome.
    <div className="fixed inset-0 z-[90]">
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
        // A bottom sheet on mobile, a centered modal from sm up: anchored to the
        // bottom edge of a wide viewport it read as a stray drawer. One media
        // query rather than a second tree, so the focus trap above is shared.
        className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface-1 p-6 shadow-2xl focus:outline-none sm:inset-0 sm:m-auto sm:h-fit sm:w-full sm:max-w-md sm:rounded-2xl sm:border"
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {/* Escape is not a phone gesture, and above a full-height sheet the
            backdrop can be a sliver, so the sheet carries its own close. It
            mirrors the 30px bordered close in ModalShell headers, inside a 44px
            hit area pulled into the padding so the visible box sits in the
            corner. First in DOM order, so it is also where focus lands. */}
        <div className="-mr-3 -mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={OVERLAY_COPY.close}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center bg-transparent text-fg-muted"
          >
            <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border">
              <CloseIcon />
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const CloseIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 2l8 8M10 2l-8 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)
