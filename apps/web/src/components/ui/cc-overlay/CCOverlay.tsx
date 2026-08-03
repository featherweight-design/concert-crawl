'use client'

// The shell underneath every anchored explainer and data panel: anchored
// popover on desktop, bottom sheet on mobile.
//
// It owns positioning, arrow, header, close button, scrim, grabber, focus trap
// and Escape, and knows nothing about its content. Both CCTip and the watcher
// roster consume it rather than growing a second popover/sheet pair.

import { useRef, type ReactNode } from 'react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { OVERLAY_COPY } from './definitions/copy'

export type OverlayMode = 'popover' | 'sheet'
export type OverlayPlacement = 'top' | 'bottom'
export type OverlayAlign = 'start' | 'center' | 'end'

interface CCOverlayProps {
  // Referenced by the trigger's aria-controls, so the caller owns it.
  id: string
  mode: OverlayMode
  // Header line on the popover, accessible name of the dialog in both shells.
  title: string
  placement?: OverlayPlacement
  align?: OverlayAlign
  width?: number
  showHeader?: boolean
  onClose: () => void
  children: ReactNode
}

const CloseGlyph = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2.5 2.5l7 7M9.5 2.5l-7 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const HEADER_CLASS =
  'flex-1 font-bold uppercase tracking-[0.14em] text-[var(--fg-subtle)]'
const HEADER_FONT = { fontFamily: 'var(--font-mono)' }

export const CCOverlay = ({
  id,
  mode,
  title,
  placement = 'top',
  align = 'center',
  width = 300,
  showHeader = true,
  onClose,
  children,
}: CCOverlayProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  // The trap ref sits on the dialog, never on the wrapper that also holds the
  // scrim — a wrapper would put the scrim inside the trap and hand it a tab
  // stop. Popovers stay untrapped: they are not modal and hover-open panels
  // must not steal focus.
  useFocusTrap(dialogRef, mode === 'sheet')

  if (mode === 'sheet') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col justify-end">
        {/* Click-to-dismiss only, and deliberately not a control: the header's
            close button is the accessible close. A <button aria-hidden> would
            be an interactive element hidden from assistive tech, and even at
            tabIndex -1 a pointer press moves focus onto it and out of the
            trap. A presentational div can do neither. */}
        <div
          role="presentation"
          onClick={onClose}
          data-testid="cc-overlay-scrim"
          className="absolute inset-0 cursor-pointer bg-[var(--scrim)] backdrop-blur-[1.5px]"
        />
        <div
          ref={dialogRef}
          id={id}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="relative max-h-[78%] overflow-y-auto rounded-t-[18px] border-t border-[var(--border-strong)] bg-[var(--bg-elevated)] px-[18px] pb-[26px] pt-[10px] text-left outline-none"
          style={{ boxShadow: '0 -20px 50px -18px var(--shadow-strong)' }}
        >
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-[38px] rounded-full bg-[var(--border-strong)]"
          />
          {showHeader && (
            <div className="mb-[11px] flex items-center gap-[10px]">
              <span
                className={`${HEADER_CLASS} text-[10px]`}
                style={HEADER_FONT}
              >
                {title}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={OVERLAY_COPY.close}
                className="inline-flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--fg-muted)]"
              >
                <CloseGlyph size={12} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    )
  }

  const vertical =
    placement === 'bottom'
      ? { top: 'calc(100% + 11px)' }
      : { bottom: 'calc(100% + 11px)' }
  const horizontal =
    align === 'start'
      ? { left: -10 }
      : align === 'end'
        ? { right: -10 }
        : { left: '50%', transform: 'translateX(-50%)' }
  const arrowVertical =
    placement === 'bottom' ? { top: -4.5 } : { bottom: -4.5 }
  const arrowHorizontal =
    align === 'start'
      ? { left: 17 }
      : align === 'end'
        ? { right: 17 }
        : { left: '50%', marginLeft: -4.5 }

  return (
    <div
      id={id}
      role="dialog"
      aria-label={title}
      className="absolute z-40 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-[14px] text-left"
      style={{
        width,
        ...vertical,
        ...horizontal,
        boxShadow:
          '0 18px 44px -14px var(--shadow-strong), 0 2px 6px -2px var(--shadow-soft)',
      }}
    >
      <span
        aria-hidden
        className="absolute h-[9px] w-[9px] rotate-45 border-l border-t border-[var(--border-strong)] bg-[var(--bg-elevated)]"
        style={{ ...arrowVertical, ...arrowHorizontal }}
      />
      {showHeader && (
        <div className="mb-[9px] flex items-start gap-[10px]">
          <span
            className={`${HEADER_CLASS} pt-px text-[9.5px]`}
            style={HEADER_FONT}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={OVERLAY_COPY.close}
            className="inline-flex h-[18px] w-[18px] flex-shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-[var(--fg-subtle)]"
          >
            <CloseGlyph size={11} />
          </button>
        </div>
      )}
      {children}
    </div>
  )
}
