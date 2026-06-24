'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { Eyebrow } from '@/components/consumer/glyphs'
import { LadderRow } from './LadderRow'

// Centerpiece of #641. Two-row ladder (resale + ghost box-office) with a
// `--signal` CTA. Drives the pedagogy that resale price !== face value.
//
// Property table §1 (lines 52–214) + plan lines 460–753.
//
// Variants:
//   - 'default'  → state #10 (sold-out + resale)         — headline: "That's resale — not face value."
//   - 'no-price' → state #12 (no-price + resale shown)   — headline: "All we can see is resale."
//
// State #11 (sold-out + no resale + no primary + no boxoffice) is handled by
// the sibling `ContributeFaceValueCard` — NOT a variant of this component.
// See §9 Q1 lock in the property table.

const copy = CONSUMER_COPY.priceRegion.faceValue

export interface FaceValueCardProps {
  variant: 'default' | 'no-price'
  resaleVendor: string
  resaleRange?: string
  onAddPrice: () => void
}

export const FaceValueCard = ({
  variant,
  resaleVendor,
  resaleRange,
  onAddPrice,
}: FaceValueCardProps) => {
  const headline =
    variant === 'no-price' ? copy.headlineNoPrice : copy.headlineDefault
  const ctaLabel =
    variant === 'no-price' ? copy.ctaLabelNoPrice : copy.ctaLabelDefault
  const resaleRight = resaleRange ?? copy.ladderResaleRightFallback

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ padding: '14px 14px 10px' }}>
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <div
          style={{
            marginTop: 7,
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 16.5,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            textWrap: 'balance',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: 'Inter, system-ui',
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
          }}
        >
          {copy.subline}
        </div>
      </div>

      <div
        style={{
          margin: '2px 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <LadderRow
          kind="resale"
          label={copy.ladderResaleLabel}
          sub={copy.ladderResaleSub(resaleVendor)}
          right={resaleRight}
          ghost={false}
        />
        <div
          style={{ height: 1, background: 'var(--border)', margin: '0 14px' }}
        />
        <LadderRow
          kind="boxoffice"
          label={copy.ladderBoxofficeLabel}
          sub={copy.ladderBoxofficeSub}
          right={copy.ladderBoxofficeRight}
          ghost
        />
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        <button
          type="button"
          onClick={onAddPrice}
          style={{
            all: 'unset',
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 46,
            borderRadius: 10,
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '-0.01em',
            boxShadow: '0 12px 28px -14px var(--signal)',
          }}
        >
          {ctaLabel}
          <svg
            width={13}
            height={13}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 8h9M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          style={{
            marginTop: 9,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {copy.caption}
        </div>
      </div>
    </div>
  )
}
