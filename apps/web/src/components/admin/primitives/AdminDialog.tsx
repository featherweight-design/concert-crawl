'use client'

import { useRef, type ReactNode } from 'react'
import { useDialogKeyboard } from './useDialogKeyboard'

export interface AdminDialogProps {
  /**
   * Accent colour as a CSS value, e.g. `var(--danger)`. Kept a raw string
   * rather than a tone enum because callers already pass one and the set in
   * use is open (danger, warning, signal, and a derived accent in the bulk
   * flows, which picks its colour from the action).
   */
  accent: string
  /** Announced name. Usually the heading, but the two differ where the heading is a node. */
  label: string
  eyebrow: string
  heading: ReactNode
  /** Panel width in px. Existing dialogs run 400 to 560. */
  width?: number
  /**
   * False while a request is in flight: the scrim stops dismissing and
   * Escape goes inert, because the work has already been committed and
   * "cancelling" it would be a lie.
   */
  dismissible?: boolean
  onDismiss: () => void
  /** Body content, inside the padded head block. */
  children: ReactNode
  /** Action row. Callers own their own buttons; this is not a fixed pair. */
  footer: ReactNode
}

/**
 * Shared chrome and modal behaviour for admin dialogs.
 *
 * Ten components hand-rolled this scrim and panel, and only two of them
 * handled Escape or focus — so eight claimed `aria-modal="true"` over a
 * background that was still fully reachable by keyboard. The behaviour lives
 * in `useDialogKeyboard`; this adds the chrome so the two cannot drift apart
 * again.
 *
 * Deliberately NOT a confirmation component. It owns modality — scrim, panel,
 * heading, keyboard — and leaves confirmation POLICY to the caller through
 * `footer` and `children`. That is what lets `BulkDeleteConfirm` keep its
 * typed-token gate without this growing a `requireTypedToken` prop, and what
 * would have to be reversed the first time a dialog needs a third button.
 */
export const AdminDialog = ({
  accent,
  label,
  eyebrow,
  heading,
  width = 520,
  dismissible = true,
  onDismiss,
  children,
  footer,
}: AdminDialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogKeyboard(panelRef, onDismiss, { dismissible })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(evt) => {
        if (!dismissible) return
        if (evt.target === evt.currentTarget) onDismiss()
      }}
    >
      <div
        ref={panelRef}
        style={{
          width,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          borderTop: `3px solid ${accent}`,
          border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 14px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {eyebrow}
          </div>
          <h3
            style={{
              margin: '9px 0 0',
              fontSize: 21,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {heading}
          </h3>
          {children}
        </div>
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            background: 'var(--surface-1)',
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}
