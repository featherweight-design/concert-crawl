'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
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
export interface MultiTierLiveCardProps {
  headline: {
    floor: number
    ceiling?: number
    tier: string
    vendor: string
  }
  alternates: Array<AlternateTier>
}

// ── Helpers ──────────────────────────────────────────────────────
const formatHeadlinePrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–${ceiling}`
  return `$${floor}`
}

// ── Component ────────────────────────────────────────────────────
export const MultiTierLiveCard = ({
  headline,
  alternates,
}: MultiTierLiveCardProps) => {
  const hasAlternates = alternates.length > 0

  return (
    <div
      style={{
        borderRadius: '12px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: '14px 14px 12px',
      }}
    >
      {/* "from" label */}
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '13px',
          color: 'var(--fg-muted)',
          margin: 0,
        }}
      >
        {copy.fromLabel}
      </p>

      {/* Headline price */}
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 800,
          fontSize: '28px',
          color: 'var(--fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: '2px 0 0',
        }}
      >
        {formatHeadlinePrice(headline.floor, headline.ceiling)}
      </p>

      {/* Headline tier label */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
          fontSize: '11px',
          color: 'var(--fg-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: '4px 0 0',
        }}
      >
        {headline.tier}
      </p>

      {/* Other tiers section */}
      {hasAlternates && (
        <div style={{ marginTop: '12px' }}>
          <p
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              marginBottom: '2px',
              marginTop: 0,
            }}
          >
            {copy.otherTiersEyebrow}
          </p>
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
      )}
    </div>
  )
}
