'use client'

// Founder post-claim seat reveal (#781 §3.3, PR 4.2) — full-bleed surface
// that replaces the tier picker sheet after a successful founder checkout.
// No confetti, no entrance animation (design brief §3.3). Escape and the
// CTA both hand control back via onDone.

import { useEffect } from 'react'
import { TIER_PICKER_COPY } from './definitions/copy'
import { FULL_BLEED_TAKEOVER_Z_INDEX } from './definitions/constants'
import { TierBadge } from './TierBadge'

const CLAIM_COPY = TIER_PICKER_COPY.founderClaim

interface FounderClaimTakeoverProps {
  variant: 'mobile' | 'desktop'
  seatNumber: number
  seatsTotal: number
  onDone: () => void
}

const MonoEyebrow = ({
  size = 10,
  color = 'var(--fg-subtle)',
  letterSpacing = '0.14em',
  children,
}: {
  size?: number
  color?: string
  letterSpacing?: string
  children: React.ReactNode
}) => (
  <span
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing,
      color,
    }}
  >
    {children}
  </span>
)

// Trail circles (cx, cy, radius) — opacity ramps 0.35 → 0.89 by index.
const MMARK_TRAIL: ReadonlyArray<readonly [number, number, number]> = [
  [14, 76, 1.5],
  [24, 70, 2],
  [34, 64, 2.5],
  [42, 58, 3],
  [50, 50, 4],
  [58, 42, 5],
  [66, 32, 6],
]

const MMark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
    <rect width={96} height={96} fill="var(--bg)" rx={16} />
    <circle cx={72} cy={24} r={20} fill="var(--accent)" opacity={0.22} />
    <circle cx={72} cy={24} r={12} fill="var(--accent)" opacity={0.42} />
    <circle cx={72} cy={24} r={7} fill="var(--signal)" />
    {MMARK_TRAIL.map(([cx, cy, radius], idx) => (
      <circle
        key={`${cx}-${cy}`}
        cx={cx}
        cy={cy}
        r={radius}
        fill="var(--signal)"
        opacity={0.35 + idx * 0.09}
      />
    ))}
  </svg>
)

export const FounderClaimTakeover = ({
  variant,
  seatNumber,
  seatsTotal,
  onDone,
}: FounderClaimTakeoverProps) => {
  const wide = variant === 'desktop'

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onDone()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDone])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={CLAIM_COPY.ariaLabel}
      data-testid="founder-claim-takeover"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: FULL_BLEED_TAKEOVER_Z_INDEX,
        width: '100%',
        height: '100%',
        background:
          'radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--accent) 12%, var(--bg)) 0%, var(--bg) 55%)',
        color: 'var(--fg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: wide ? 40 : '70px 20px 28px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: wide ? 520 : '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: wide ? 22 : 18,
          color: 'var(--fg)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--signal)',
                flexShrink: 0,
                boxShadow: '0 0 8px var(--signal)',
              }}
            />
            <MonoEyebrow color="var(--signal)" letterSpacing="0.16em">
              {CLAIM_COPY.eyebrow}
            </MonoEyebrow>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <MonoEyebrow>
              {CLAIM_COPY.seatCode(seatNumber, seatsTotal)}
            </MonoEyebrow>
          </div>
        </div>

        {/* Mark with halo */}
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -14,
              borderRadius: 30,
              background:
                'radial-gradient(circle, color-mix(in oklch, var(--accent) 45%, transparent), transparent 72%)',
            }}
          />
          <MMark size={72} />
        </div>

        {/* Seat number reveal — renders unpadded (`#38`); the design canvas
            showed `#03` but the component contract is verbatim numerals. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <MonoEyebrow size={11} color="var(--fg-muted)" letterSpacing="0.22em">
            {CLAIM_COPY.seatLabel}
          </MonoEyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              data-testid="founder-claim-seat-number"
              style={{
                fontWeight: 900,
                fontSize: wide ? 104 : 80,
                letterSpacing: '-0.05em',
                lineHeight: 0.9,
                color: 'var(--accent)',
                textShadow:
                  '0 0 40px color-mix(in oklch, var(--accent) 35%, transparent)',
              }}
            >
              {CLAIM_COPY.seatNumber(seatNumber)}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: wide ? 24 : 20,
                color: 'var(--fg-muted)',
                letterSpacing: '-0.02em',
              }}
            >
              {CLAIM_COPY.seatTotal(seatsTotal)}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              fontWeight: 900,
              fontSize: wide ? 44 : 34,
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              margin: 0,
            }}
          >
            {CLAIM_COPY.headline}
          </h1>
          <p
            style={{
              fontWeight: 500,
              fontSize: wide ? 15.5 : 14,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
              lineHeight: 1.5,
              maxWidth: 420,
              margin: 0,
            }}
          >
            {CLAIM_COPY.body}
          </p>
        </div>

        {/* Locked price stamp + badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: 999,
              background:
                'linear-gradient(135deg, color-mix(in oklch, var(--accent) 16%, var(--surface-1)), color-mix(in oklch, var(--signal) 14%, var(--surface-1)))',
              border:
                '1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))',
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: '-0.03em',
                color: 'var(--fg)',
              }}
            >
              {CLAIM_COPY.priceStamp}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--fg-muted)',
                }}
              >
                {CLAIM_COPY.priceStampUnit}
              </span>
            </span>
            <span
              aria-hidden
              style={{
                width: 1,
                height: 16,
                background: 'var(--border-strong)',
              }}
            />
            <MonoEyebrow
              size={9.5}
              color="var(--accent)"
              letterSpacing="0.16em"
            >
              {CLAIM_COPY.priceStampEyebrow}
            </MonoEyebrow>
          </div>
          <TierBadge tier="founder" size="lg" />
        </div>

        {/* Single CTA — explicit reset instead of the design's all:unset
            so UA focus styles survive (codebase a11y convention). */}
        <button
          type="button"
          onClick={onDone}
          style={{
            border: 'none',
            cursor: 'pointer',
            textAlign: 'center',
            width: wide ? 320 : '100%',
            maxWidth: 360,
            padding: '15px 16px',
            borderRadius: 12,
            background:
              'linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))',
            color: 'var(--fg-on-accent)',
            fontWeight: 800,
            fontSize: 15.5,
            boxShadow:
              '0 0 26px color-mix(in oklch, var(--accent) 35%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {CLAIM_COPY.cta}
          <svg width="15" height="15" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M4.5 2 L8.5 6 L4.5 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <MonoEyebrow size={9} letterSpacing="0.16em">
          {CLAIM_COPY.footerHint}
        </MonoEyebrow>
      </div>
    </div>
  )
}
