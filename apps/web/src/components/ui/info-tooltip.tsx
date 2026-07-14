'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

interface InfoTooltipProps {
  // Short explanatory text shown in the popover.
  content: string
  // Accessible name for the trigger, combined with `content` so screen
  // readers announce the full explanation on focus regardless of open state.
  triggerLabel: string
  // Visible trigger content (e.g. the pill label).
  children: ReactNode
  // Visual styling for the trigger button; the caller owns the pill look.
  triggerStyle?: CSSProperties
  triggerClassName?: string
}

// Reusable click-triggered info popover. Click (or Enter/Space) toggles it;
// Escape or an outside pointer press closes it. Unlike the native `title`
// attribute it has no hover delay, works on touch, and is exposed to assistive
// tech. Mirrors the Escape + pointerdown-outside dismissal used by
// FilterPopover so dismissal behaves consistently across the app.
export const InfoTooltip = ({
  content,
  triggerLabel,
  children,
  triggerStyle,
  triggerClassName,
}: InfoTooltipProps) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <span
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        aria-label={`${triggerLabel}. ${content}`}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-1${
          triggerClassName ? ` ${triggerClassName}` : ''
        }`}
        style={{
          appearance: 'none',
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          cursor: 'pointer',
          ...triggerStyle,
        }}
      >
        {children}
      </button>

      {open && (
        <span
          id={panelId}
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width: 'max-content',
            maxWidth: 240,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 11.5,
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
            textTransform: 'none',
            whiteSpace: 'normal',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
          }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
