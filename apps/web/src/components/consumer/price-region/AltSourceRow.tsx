'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const TIER_COLOR = {
  boxoffice: 'oklch(0.66 0.14 78)',
  resale: 'oklch(0.65 0.20 25)',
  community: 'oklch(0.62 0.12 240)',
} as const

const copy = CONSUMER_COPY.priceRegion.altSourceRow

export interface AltSourceRowProps {
  source: string
  kind: 'boxoffice' | 'resale' | 'community'
  price: number
}

export const AltSourceRow = ({ source, kind, price }: AltSourceRowProps) => {
  const color = TIER_COLOR[kind]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px dashed var(--border)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          background: color,
          alignSelf: 'center',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--fg-muted)',
        }}
      >
        {source}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8.5,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {copy.kindLabels[kind]}
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.pricePrefix}
        {price}
      </span>
    </div>
  )
}
