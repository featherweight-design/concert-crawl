'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { Eyebrow } from '@/components/consumer/glyphs'
import { LadderRow } from './LadderRow'

// Sibling of `FaceValueCard` for property table state #11 (sold-out + no
// resale + no primary + no boxoffice). Per §9 Q1 lock + Appendix A.1:
//   "it is NOT a FaceValueCard anymore — what survives is the contribution
//   half."
//
// Same chrome family as FaceValueCard (12px radius, surface-1, border) but
// degrades to contribution-only: ONE ghost box-office row, no resale row,
// no outbound CTA. Eyebrow drops the "≠ resale" framing because there's
// nothing to compare to.

const copy = CONSUMER_COPY.priceRegion.contributeFaceValue

export interface ContributeFaceValueCardProps {
  onAddPrice: () => void
}

export const ContributeFaceValueCard = ({
  onAddPrice,
}: ContributeFaceValueCardProps) => {
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
          {copy.headline}
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
          {copy.ctaLabel}
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
