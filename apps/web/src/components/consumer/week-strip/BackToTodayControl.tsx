'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { RotateCcwGlyph } from '@/components/consumer/jump-picker'

interface BackToTodayControlProps {
  todaySpoken: string
  onClick: () => void
}

const STYLE_ID = 'b2t-styles'
const STYLE_CONTENT = [
  // Fade + slide-in from the right as it emerges in the nav cluster.
  '.b2t{transition:opacity .17s ease,transform .17s cubic-bezier(.2,.7,.3,1)}',
  '.b2t.b2t-pre{opacity:0;transform:translateX(7px)}',
  '.b2t.b2t-in{opacity:1;transform:none}',
  '.b2t-pill{transition:background .12s,border-color .12s}',
  // The pill's background/border/padding/gap are set as inline styles, which win
  // the cascade — so hover chrome and the ≤360px collapse must use !important to
  // take effect.
  '.b2t:hover .b2t-pill{background:var(--overlay-press)!important;border-color:var(--border-focus)!important}',
  '.b2t:focus-visible{outline:none}',
  '.b2t:focus-visible .b2t-pill{outline:2px solid var(--focus);outline-offset:2px}',
  // ≤360px: collapse to icon-only. The pill loses its side padding and the word
  // hides — SSR-safe, no JS viewport branch.
  '@media (max-width:360px){.b2t-pill{width:34px!important;padding:0!important;gap:0!important}.b2t-label{display:none}}',
  '@media (prefers-reduced-motion:reduce){.b2t{transition:none!important;transform:none!important;opacity:1!important}}',
  '@media print{.b2t{transition:none!important;transform:none!important;opacity:1!important}}',
].join('\n')

const ensureStyles = (): void => {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = STYLE_CONTENT
  document.head.appendChild(styleEl)
}

// Transparent ≥44px touch target; the visible pill sits inside at 34px so it
// lines up with the 34px week chevrons beside it.
const hitStyle: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  minHeight: 44,
  minWidth: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 34,
  boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 999,
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  color: 'var(--fg)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

export const BackToTodayControl = ({
  todaySpoken,
  onClick,
}: BackToTodayControlProps) => {
  const [entered, setEntered] = useState(false)

  useEffect(ensureStyles, [])
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <button
      type="button"
      className={`b2t ${entered ? 'b2t-in' : 'b2t-pre'}`}
      onClick={onClick}
      aria-label={`${CONSUMER_COPY.backToTodayAriaPrefix}, ${todaySpoken}`}
      style={hitStyle}
    >
      <span className="b2t-pill" style={pillStyle}>
        <RotateCcwGlyph />
        <span className="b2t-label">{CONSUMER_COPY.backToTodayLabel}</span>
      </span>
    </button>
  )
}
