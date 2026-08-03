import React from 'react'
import type { PassportModeConfig } from '@/components/consumer/passport/definitions/modes'

export interface PassportStatProps {
  value: string | number
  label: string
  cfg: PassportModeConfig
  fg: string
  fgMuted: string
  /** Draws the value in the theme's signal colour. */
  accent?: boolean
  signal: string
}

/**
 * One figure in the bottom readout. A numeric value gets the display size; a
 * name — "top genre" — gets the smaller one, because a genre long enough to
 * need it would otherwise push the other two stats off the card.
 */
export const PassportStat = ({
  value,
  label,
  cfg,
  fg,
  fgMuted,
  accent = false,
  signal,
}: PassportStatProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: cfg.statLabel * 0.32,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: typeof value === 'number' ? cfg.statBig : cfg.statMid,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: accent ? signal : fg,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize: cfg.statLabel,
        letterSpacing: '0.16em',
        color: fgMuted,
      }}
    >
      {label.toUpperCase()}
    </span>
  </div>
)
