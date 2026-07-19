'use client'

import { useState, useEffect, useCallback } from 'react'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  header?: React.ReactNode
  footer?: React.ReactNode
  mobileFooter?: React.ReactNode
  children: React.ReactNode
  sheetHeight?: 'tall' | 'short'
  /** Desktop modal width in px (default 520). Wide surfaces (tier picker) pass more. */
  desktopWidth?: number
  /**
   * The shell is the single modal root in the accessibility tree, so
   * surfaces that change its meaning (payment failure = alertdialog)
   * override the role/labeling here instead of nesting a second dialog.
   */
  role?: 'dialog' | 'alertdialog'
  ariaLabelledBy?: string
  ariaDescribedBy?: string
}

export function ModalShell({
  open,
  onClose,
  ariaLabel,
  header,
  footer,
  mobileFooter,
  children,
  sheetHeight = 'tall',
  desktopWidth = 520,
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalShellProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const handleKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  const heightValue = sheetHeight === 'tall' ? '85%' : '62%'

  return (
    <>
      <div
        data-testid="modal-scrim"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'var(--scrim)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {isMobile ? (
        <div
          role={role}
          aria-modal="true"
          aria-label={ariaLabelledBy === undefined ? ariaLabel : undefined}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: heightValue,
            zIndex: 100,
            background: 'var(--bg-elevated)',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-strong)',
              }}
            />
          </div>
          {header != null && (
            <div style={{ flexShrink: 0, padding: '10px 16px 8px' }}>
              {header}
            </div>
          )}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '6px 18px 18px',
            }}
          >
            {children}
          </div>
          {(mobileFooter ?? footer) && (
            <div
              style={{
                flexShrink: 0,
                padding: '12px 18px 22px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              {mobileFooter ?? footer}
            </div>
          )}
        </div>
      ) : (
        <div
          role={role}
          aria-modal="true"
          aria-label={ariaLabelledBy === undefined ? ariaLabel : undefined}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            width: desktopWidth,
            maxWidth: 'calc(100% - 64px)',
            maxHeight: 'calc(100% - 80px)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {header != null && (
            <div
              style={{
                flexShrink: 0,
                padding: '10px 16px 8px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {header}
            </div>
          )}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '18px 22px',
            }}
          >
            {children}
          </div>
          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: '14px 22px 18px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </>
  )
}
