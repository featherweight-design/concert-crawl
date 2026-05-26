'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { Eyebrow, PendingTrustPill } from '@/components/consumer/glyphs'
import {
  TierAlternateRow,
  type TierAlternateRowProps,
} from '@/components/consumer/multi-tier/TierAlternateRow'

const copy = CONSUMER_COPY.multiTier

// ── Types ────────────────────────────────────────────────────────
interface AlternateTier {
  tier: string
  vendor: string
  floor: number
  ceiling?: number
  kind: 'community' | 'boxoffice' | null
  pending?: boolean
  confirms?: number
  needed?: number
}

// ── Props ────────────────────────────────────────────────────────
export interface MixedTierCardProps {
  headline: {
    floor: number
    ceiling?: number
    tier: string
    vendor: string
    kind: 'community' | 'boxoffice'
  }
  alternates: Array<AlternateTier>
}

// ── Helpers ──────────────────────────────────────────────────────
const formatHeadlinePrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–${ceiling}`
  return `$${floor}`
}

// ── Component ────────────────────────────────────────────────────
export const MixedTierCard = ({ headline, alternates }: MixedTierCardProps) => {
  return (
    <div
      style={{
        borderRadius: '12px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: '14px 14px 12px',
      }}
    >
      {/* Eyebrow */}
      <Eyebrow>Tickets</Eyebrow>

      {/* Headline flex row */}
      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.fromLabel}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          {formatHeadlinePrice(headline.floor, headline.ceiling)}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '11px',
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {headline.tier}
        </span>
        <PendingTrustPill kind={headline.kind} />
      </div>

      {/* Vendor/observation line */}
      <div
        style={{
          marginTop: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: 'var(--fg-muted)',
          letterSpacing: '0.04em',
        }}
      >
        {'seen on ' + headline.vendor}
      </div>

      {/* Other tiers section — always rendered */}
      <div style={{ marginTop: '12px' }}>
        <Eyebrow>{copy.otherTiersEyebrow}</Eyebrow>
        {alternates.map((alt, idx) => {
          const rowProps: TierAlternateRowProps = {
            tier: alt.tier,
            vendor: alt.vendor,
            floor: alt.floor,
            kind: alt.kind,
            ...(alt.ceiling !== undefined ? { ceiling: alt.ceiling } : {}),
            ...(alt.pending !== undefined ? { pending: alt.pending } : {}),
            ...(alt.confirms !== undefined ? { confirms: alt.confirms } : {}),
            ...(alt.needed !== undefined ? { needed: alt.needed } : {}),
          }
          return <TierAlternateRow key={`${alt.tier}-${idx}`} {...rowProps} />
        })}
      </div>
    </div>
  )
}
