'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.priceRegion.provenance
const TIER_COLOR_RESALE = 'oklch(0.65 0.20 25)'
const TIER_COLOR_BOXOFFICE = 'oklch(0.66 0.14 78)'

export type ProvenanceCTAKind = 'boxoffice' | 'primary' | 'resale'

export interface ProvenanceCTAProps {
  kind: ProvenanceCTAKind
  vendor: string
  href: string
  outline?: boolean
}

export const ProvenanceCTA = ({
  kind,
  vendor,
  href,
  outline = false,
}: ProvenanceCTAProps) => {
  const isResale = kind === 'resale'
  const label = isResale ? copy.seeResale : copy.getTickets
  const caption =
    kind === 'boxoffice'
      ? copy.captionBoxoffice(vendor)
      : kind === 'primary'
        ? copy.captionPrimary(vendor)
        : copy.captionResale(vendor)
  const ariaLabel =
    kind === 'boxoffice'
      ? copy.ariaLabelBoxoffice(vendor)
      : kind === 'primary'
        ? copy.ariaLabelPrimary(vendor)
        : copy.ariaLabelResale(vendor)
  const dotColor =
    kind === 'boxoffice'
      ? TIER_COLOR_BOXOFFICE
      : kind === 'resale'
        ? TIER_COLOR_RESALE
        : 'var(--fg-subtle)'
  const captionColor = isResale
    ? `color-mix(in oklab, ${TIER_COLOR_RESALE} 92%, var(--fg-muted))`
    : 'var(--fg-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          width: '100%',
          borderRadius: 10,
          boxSizing: 'border-box',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.01em',
          background: outline ? 'transparent' : 'var(--signal)',
          border: outline ? '1px solid var(--border-strong)' : 'none',
          color: outline ? 'var(--fg)' : 'var(--fg-on-accent)',
        }}
      >
        {label} ↗
      </a>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          justifyContent: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: dotColor,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: captionColor,
            letterSpacing: '0.03em',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  )
}
