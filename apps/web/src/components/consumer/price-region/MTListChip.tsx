import { StarGlyph } from '@/components/consumer/glyphs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const GOLD = 'oklch(0.66 0.14 78)'
const RESALE = 'oklch(0.65 0.20 25)'

export type MTListChipKind = 'boxoffice' | 'community' | 'resale' | null

export interface MTListChipProps {
  price: number
  kind: MTListChipKind
  from?: boolean
}

const colorFor = (kind: MTListChipKind): string => {
  if (kind === 'boxoffice') return GOLD
  if (kind === 'community') return 'var(--fg)'
  if (kind === 'resale') return RESALE
  return 'var(--fg-muted)'
}

export const MTListChip = ({ price, kind, from = true }: MTListChipProps) => {
  const color = colorFor(kind)
  const text = from
    ? `${CONSUMER_COPY.priceRegion.mtListChip.fromPrefix} $${price}`
    : `$${price}`

  // kind='resale' — Appendix A.3 locked spec: coral chrome + always-present resale tag.
  if (kind === 'resale') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7, // NOTE: 7px not 6px — addendum-specified to fit trailing tag
          padding: '5px 10px',
          borderRadius: 8,
          background: `color-mix(in oklab, ${RESALE} 8%, var(--surface-1))`,
          border: `1px solid color-mix(in oklab, ${RESALE} 34%, var(--border))`,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: RESALE,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 14,
            color: RESALE,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5,
            fontWeight: 700,
            color: RESALE,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.95,
          }}
        >
          {CONSUMER_COPY.priceRegion.mtListChip.resaleTag}
        </span>
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      {kind === 'boxoffice' && <StarGlyph size={10} color={GOLD} />}
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          color,
        }}
      >
        {text}
      </span>
    </span>
  )
}
