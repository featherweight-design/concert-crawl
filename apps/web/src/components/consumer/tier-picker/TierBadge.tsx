// Tier badge — Supporter (accent +), Premium (signal star), Founder
// (gradient crown). Free renders nothing. From monetization-shared.jsx.

import { TIER_PICKER_COPY } from './definitions/copy'
import type { TierKey } from './definitions/types'

interface TierBadgeProps {
  tier: TierKey
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { pad: '3px 7px', fontSize: 9, glyph: 8, gap: 5, radius: 4 },
  md: { pad: '4px 9px', fontSize: 10, glyph: 9, gap: 5, radius: 5 },
  lg: { pad: '5px 11px', fontSize: 11, glyph: 10, gap: 6, radius: 6 },
} as const

export const TierBadge = ({ tier, size = 'md' }: TierBadgeProps) => {
  if (tier === 'free') return null
  const sz = SIZES[size]

  const styles = {
    supporter: {
      background: 'color-mix(in oklch, var(--accent) 14%, transparent)',
      border: '1px solid color-mix(in oklch, var(--accent) 36%, transparent)',
      color: 'var(--accent)',
      label: TIER_PICKER_COPY.badges.supporter,
      glyph: (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
          +
        </span>
      ),
    },
    premium: {
      background: 'color-mix(in oklch, var(--signal) 14%, transparent)',
      border: '1px solid color-mix(in oklch, var(--signal) 38%, transparent)',
      color: 'var(--signal)',
      label: TIER_PICKER_COPY.badges.premium,
      glyph: (
        <svg width={sz.glyph} height={sz.glyph} viewBox="0 0 10 10" aria-hidden>
          <polygon
            points="5,0 6.3,3.4 10,3.7 7.1,6 8.1,9.7 5,7.6 1.9,9.7 2.9,6 0,3.7 3.7,3.4"
            fill="currentColor"
          />
        </svg>
      ),
    },
    founder: {
      background:
        'linear-gradient(135deg, color-mix(in oklch, var(--accent) 18%, transparent), color-mix(in oklch, var(--signal) 18%, transparent))',
      border: '1px solid color-mix(in oklch, var(--signal) 50%, transparent)',
      color: 'var(--fg)',
      label: TIER_PICKER_COPY.badges.founder,
      glyph: (
        <svg width={sz.glyph} height={sz.glyph} viewBox="0 0 10 10" aria-hidden>
          <path
            d="M1 7 L1 3 L3 5 L5 1 L7 5 L9 3 L9 7 Z"
            fill="var(--signal)"
            stroke="var(--accent)"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  }[tier]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.gap,
        padding: sz.pad,
        borderRadius: sz.radius,
        background: styles.background,
        border: styles.border,
        color: styles.color,
        fontFamily: 'var(--font-mono)',
        fontWeight: 800,
        fontSize: sz.fontSize,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {styles.glyph}
      <span>{styles.label}</span>
    </span>
  )
}
