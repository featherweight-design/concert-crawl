'use client'

import React from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { Eyebrow, PendingTrustPill } from '@/components/consumer/glyphs'
import { TierAlternateRow } from '@/components/consumer/multi-tier/TierAlternateRow'
import { displayVendor } from '@/components/consumer/vendor-display'
import { AltSourceRow } from './AltSourceRow'

const copy = CONSUMER_COPY.priceRegion.multiSource

export interface MultiSourceMultiTierCardProps {
  headlineTier: string
  headlinePrice: number
  headlineVendor: string
  crossSource: {
    source: string
    kind: 'boxoffice' | 'resale' | 'community'
    price: number
  }
  otherTiers: ReadonlyArray<React.ComponentProps<typeof TierAlternateRow>>
}

export const MultiSourceMultiTierCard = ({
  headlineTier,
  headlinePrice,
  headlineVendor,
  crossSource,
  otherTiers,
}: MultiSourceMultiTierCardProps) => (
  <div
    style={{
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      padding: '14px 14px 12px',
    }}
  >
    <Eyebrow>{copy.eyebrow}</Eyebrow>
    <div
      style={{
        marginTop: 6,
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.fromLabel}
      </span>
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 28,
          color: 'var(--fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
        }}
      >
        ${headlinePrice}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize: 11,
          color: 'var(--fg-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {headlineTier}
      </span>
      <PendingTrustPill kind="boxoffice" />
    </div>
    <div
      style={{
        marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--fg-muted)',
        letterSpacing: '0.04em',
      }}
    >
      {copy.metaTemplate(displayVendor(headlineVendor))}
    </div>

    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 2 }}>
        <Eyebrow>{copy.orPayConvenience}</Eyebrow>
      </div>
      <AltSourceRow
        source={crossSource.source}
        kind={crossSource.kind}
        price={crossSource.price}
      />
    </div>

    {otherTiers.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <Eyebrow>{copy.otherTiers}</Eyebrow>
        {otherTiers.map((row, idx) => (
          <TierAlternateRow key={`${row.tier}-${idx}`} {...row} />
        ))}
      </div>
    )}
  </div>
)
