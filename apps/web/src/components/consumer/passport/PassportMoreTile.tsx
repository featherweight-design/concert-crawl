import React from 'react'
import { PASSPORT_COPY } from '@/components/consumer/passport/definitions/copy'
import type { PassportModeConfig } from '@/components/consumer/passport/definitions/modes'
import { passportRotation } from '@/lib/passport/stamp'

export interface PassportMoreTileProps {
  /** How many attended shows did not fit on the wall. */
  count: number
  cfg: PassportModeConfig
  width: number
  height: number
  surface: string
  border: string
  fg: string
  fgMuted: string
}

/**
 * The quiet `+N more` tile that finishes the wall when a history overflows the
 * grid. Deliberately the one tile drawn in theme chrome rather than identity
 * art — it is a count, not a show, and dressing it as one would imply a
 * seventeenth stamp that isn't there.
 */
export const PassportMoreTile = ({
  count,
  cfg,
  width,
  height,
  surface,
  border,
  fg,
  fgMuted,
}: PassportMoreTileProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: cfg.stampDate * 0.4,
      width,
      height,
      borderRadius: cfg.stampRadius,
      border: `${cfg.hairline * 1.5}px dashed ${border}`,
      background: surface,
      transform: `rotate(${passportRotation('more-tile')}deg)`,
    }}
  >
    <span
      style={{
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: cfg.statMid,
        letterSpacing: '-0.03em',
        color: fg,
        lineHeight: 1,
      }}
    >
      {`+${count}`}
    </span>
    <span
      style={{
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize: cfg.stampDate,
        letterSpacing: '0.16em',
        color: fgMuted,
      }}
    >
      {PASSPORT_COPY.moreTile}
    </span>
  </div>
)
