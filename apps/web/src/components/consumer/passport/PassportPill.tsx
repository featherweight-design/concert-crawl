import React from 'react'
import type { PassportModeConfig } from '@/components/consumer/passport/definitions/modes'

export interface PassportPillProps {
  cfg: PassportModeConfig
  /** The theme's scrim — the pill's fill. */
  scrim: string
  /** Drops the blur. Satori implements no `backdropFilter`. */
  print?: boolean
  muted?: boolean
  fontSize?: number
  children: React.ReactNode
}

/**
 * The glass pill the header floats over the stamp wall in.
 *
 * One component, two variants. On screen it is genuine glassmorphism; in print
 * the blur is dropped, because satori implements no `backdropFilter` and would
 * silently render an unblurred pill anyway. Making that explicit is what keeps
 * the preview honest about what the PNG will contain — a second component would
 * let the two drift.
 */
export const PassportPill = ({
  cfg,
  scrim,
  print = false,
  muted = false,
  fontSize,
  children,
}: PassportPillProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: cfg.pillGap,
      padding: `${cfg.pillPadV}px ${cfg.pillPadH}px`,
      borderRadius: 999,
      background: scrim,
      ...(print
        ? {}
        : { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }),
      border: `${cfg.hairline}px solid rgba(255,255,255,0.16)`,
      fontFamily: 'JetBrains Mono',
      fontWeight: 700,
      fontSize: fontSize ?? cfg.headEyebrow,
      letterSpacing: '0.16em',
      color: muted ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.94)',
      whiteSpace: 'nowrap',
      lineHeight: 1,
    }}
  >
    {children}
  </div>
)
