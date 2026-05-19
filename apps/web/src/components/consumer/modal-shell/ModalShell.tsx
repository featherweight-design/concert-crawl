'use client'

import { useState, useEffect, useCallback } from 'react'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  header: React.ReactNode
  footer?: React.ReactNode
  mobileFooter?: React.ReactNode
  children: React.ReactNode
  sheetHeight?: 'tall' | 'short'
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
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
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
          <div style={{ flexShrink: 0, padding: '0 18px 12px' }}>{header}</div>
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
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            width: 520,
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
          <div
            style={{
              flexShrink: 0,
              padding: '18px 22px 12px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {header}
          </div>
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
