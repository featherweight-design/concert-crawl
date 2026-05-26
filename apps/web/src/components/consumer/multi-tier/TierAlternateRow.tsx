'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.multiTier

// ── Color constants ──────────────────────────────────────────────
const GOLD = 'oklch(0.66 0.14 78)'
const AZURE = 'oklch(0.62 0.12 240)'
const AZURE_M = 'oklch(0.62 0.12 240)'

// ── Helpers ──────────────────────────────────────────────────────
const dotColor = (kind: 'community' | 'boxoffice' | null): string => {
  if (kind === 'boxoffice') return GOLD
  if (kind === 'community') return AZURE
  return 'var(--fg-muted)'
}

const formatPrice = (floor: number, ceiling?: number): string => {
  if (ceiling !== undefined) return `$${floor}–${ceiling}`
  return `$${floor}`
}

// ── Props ────────────────────────────────────────────────────────
export interface TierAlternateRowProps {
  tier: string
  vendor: string
  floor: number
  ceiling?: number
  kind: 'community' | 'boxoffice' | null
  pending?: boolean
  confirms?: number
  needed?: number
}

// ── Component ────────────────────────────────────────────────────
export const TierAlternateRow = ({
  tier,
  vendor,
  floor,
  ceiling,
  kind,
  pending = false,
  confirms = 0,
  needed = 0,
}: TierAlternateRowProps) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 0',
        borderTop: '1px dashed var(--border)',
        alignItems: 'center',
      }}
    >
      {/* Left column — tier label + dot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: '56px',
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '10.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--fg)',
          }}
        >
          {tier}
        </span>
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '2.5px',
            flexShrink: 0,
            opacity: 0.85,
            background: dotColor(kind),
          }}
        />
      </div>

      {/* Middle column — vendor or pending text */}
      <div style={{ flex: 1 }}>
        {pending ? (
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9.5px',
              color: AZURE_M,
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {copy.pendingTemplate(confirms, needed)}
          </span>
        ) : (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {vendor}
          </span>
        )}
      </div>

      {/* Right column — price */}
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          color: pending ? 'var(--fg-muted)' : 'var(--fg)',
        }}
      >
        {formatPrice(floor, ceiling)}
      </span>
    </div>
  )
}
