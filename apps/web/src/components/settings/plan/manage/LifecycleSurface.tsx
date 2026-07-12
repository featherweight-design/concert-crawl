'use client'

// Dialog chrome for the #780 manage sheet + lifecycle flows. ModalShell is
// deliberately NOT reused here: its chrome (radius 22 sheet on bg-elevated,
// fixed sheet heights, bordered header/footer split) contradicts the locked
// design tables, which specify a height-auto radius-24 sheet on var(--bg)
// with a drag handle and no chrome split. Escape/scrim dismissal, z-layers
// (scrim 90 / dialog 100) and the aria contract mirror ModalShell.

import { useCallback, useEffect } from 'react'
import { useIsMobileViewport } from './lib/use-is-mobile-viewport'
import {
  SURFACE_DIALOG_Z_INDEX,
  SURFACE_SCRIM_Z_INDEX,
} from './definitions/constants'

const DragHandle = () => (
  <div
    style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}
  >
    <div
      style={{
        width: 36,
        height: 4,
        borderRadius: 4,
        background: 'var(--border-strong)',
        opacity: 0.6,
      }}
    />
  </div>
)

interface LifecycleSurfaceProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  /** Desktop modal width in px; mobile is always the full-width sheet. */
  desktopWidth: number
  children: React.ReactNode
}

export const LifecycleSurface = ({
  open,
  onClose,
  ariaLabel,
  desktopWidth,
  children,
}: LifecycleSurfaceProps) => {
  const isMobile = useIsMobileViewport()

  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onKeyDown])

  if (!open) return null

  return (
    <>
      <div
        data-testid="lifecycle-scrim"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: SURFACE_SCRIM_Z_INDEX,
          background: 'var(--scrim)',
          backdropFilter: 'blur(4px)',
        }}
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
            zIndex: SURFACE_DIALOG_Z_INDEX,
            maxHeight: '92%',
            background: 'var(--bg)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            border: '1px solid var(--border)',
            borderBottom: 'none',
            boxShadow: '0 -20px 50px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: 'var(--fg)',
          }}
        >
          <DragHandle />
          <div
            style={{
              padding: '4px 16px 22px',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: SURFACE_DIALOG_Z_INDEX,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            style={{
              pointerEvents: 'auto',
              width: desktopWidth,
              maxWidth: 'calc(100% - 64px)',
              maxHeight: 'min(86vh, 820px)',
              borderRadius: 18,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              color: 'var(--fg)',
            }}
          >
            <div
              style={{
                padding: '24px 26px 22px',
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
