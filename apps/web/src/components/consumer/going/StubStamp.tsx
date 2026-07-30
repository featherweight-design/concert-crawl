'use client'

// Miniature ticket-stub mark for a night a user attended (#70).
// Two halves split by a dashed perforation with a centred glyph in the show's
// accent. Ported from design_handoff_concert_history/history-screens.jsx:71-117.
// Decoration everywhere it appears — the surrounding text carries the meaning,
// so it is aria-hidden unless a caller supplies a label.

import type { StampGlyph } from './lib/stamp'
import { stampAccentFor, stampGlyphFor } from './lib/stamp'

type StubStampProps = {
  artist: string
  size?: number
  accent?: string
  glyph?: StampGlyph
  className?: string
  'aria-label'?: string
}

export const StubStamp = ({
  artist,
  size = 28,
  accent,
  glyph,
  className,
  'aria-label': ariaLabel,
}: StubStampProps) => {
  const color = accent ?? stampAccentFor(artist)
  const kind = glyph ?? stampGlyphFor(artist)
  const stroke = `color-mix(in oklch, ${color} 60%, transparent)`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
    >
      <path
        d="M2 5 Q2 2 5 2 L13 2 L13 26 L5 26 Q2 26 2 23 Z"
        fill="var(--surface-2)"
        stroke={stroke}
        strokeWidth="1"
      />
      <path
        d="M15 2 L23 2 Q26 2 26 5 L26 23 Q26 26 23 26 L15 26 Z"
        fill="var(--surface-2)"
        stroke={stroke}
        strokeWidth="1"
      />
      <line
        x1="14"
        y1="3"
        x2="14"
        y2="25"
        stroke={color}
        strokeWidth="0.9"
        strokeDasharray="1.4 1.6"
        opacity="0.85"
      />
      {kind === 'star' && (
        <polygon
          transform="translate(14 14) scale(0.42) translate(-12 -12)"
          points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
          fill={color}
        />
      )}
      {kind === 'diamond' && (
        <polygon
          transform="translate(14 14) scale(0.45) translate(-12 -12)"
          points="12,2 22,12 12,22 2,12"
          fill={color}
        />
      )}
      {kind === 'ring' && (
        <circle
          cx="14"
          cy="14"
          r="4.2"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
        />
      )}
      {kind === 'triangle' && (
        <polygon
          transform="translate(14 14) scale(0.42) translate(-12 -12)"
          points="12,3 21,19 3,19"
          fill={color}
        />
      )}
    </svg>
  )
}
