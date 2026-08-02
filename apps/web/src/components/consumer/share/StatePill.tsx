import React from 'react'
import { ia_isDark } from '@/components/consumer/identity-art/IdentityArt'
import { posterStateLabel, type PosterState } from '@/lib/share/taglines'

/**
 * The pill at the top-left of the poster's bottom block: `GOING`, `SOLD OUT`,
 * or the `↓ $XX` drop variant.
 *
 * ⚠️ This is the *only* element on the poster drawn in theme tokens rather than
 * the identity-art palette. That is deliberate and load-bearing:
 *
 *  - The handoff's §4 says the identity palette is theme-independent and only
 *    "the paper scrim, fg/border tokens swap" — so something has to carry the
 *    theme, or `?theme=` is decorative and the nine-theme matrix in the tests
 *    proves nothing.
 *  - It keys on `accent` specifically because `accent` is the one share token
 *    with nine distinct values. `warning` and `success` are shared by 8 and 7
 *    themes respectively; a pill keyed on either would render eight themes
 *    byte-identically and quietly defeat the matrix.
 *
 * The state itself is carried by the label, never by colour alone.
 */
export interface StatePillProps {
  state: PosterState
  /** `↓ $12` for a price drop; when null the pill falls back to the label. */
  dropLabel: string | null
  /** Theme accent — the pill's fill. */
  accent: string
  fontSize: number
  paddingY: number
  paddingX: number
}

/** Accents run from `#9B5CFF` to `#ECDCC4`, so the text colour has to follow. */
const inkOn = (accent: string): string =>
  ia_isDark(accent) ? '#FFFFFF' : '#191418'

export const StatePill = ({
  state,
  dropLabel,
  accent,
  fontSize,
  paddingY,
  paddingX,
}: StatePillProps) => {
  const foreground = inkOn(accent)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        backgroundColor: accent,
        color: foreground,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: 999,
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 9,
          height: 9,
          borderRadius: 999,
          backgroundColor: foreground,
          opacity: 0.65,
        }}
      />
      {dropLabel ?? posterStateLabel(state)}
    </div>
  )
}
