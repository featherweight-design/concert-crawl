'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  CheckGlyph,
  Eyebrow,
  LockGlyph,
  PendingDot,
  PendingTrustPill,
} from './glyphs'

const copy = CONSUMER_COPY.pendingCardB

// ── Helpers ──────────────────────────────────────────────────────
const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Color constants ──────────────────────────────────────────────
const AZURE = 'oklch(0.62 0.12 240)' // community tier
const GOLD = 'oklch(0.66 0.14 78)' // box-office tier

// ── Token shape ──────────────────────────────────────────────────
interface PendingTokens {
  color: string
  bg: string
  border: string
  strip: string
  stripBorder: string
  pill: string
}

const pendingTokens = (kind: 'community' | 'boxoffice'): PendingTokens => {
  if (kind === 'community') {
    return {
      color: AZURE,
      bg: `color-mix(in oklab, ${AZURE} 6%, var(--surface-1))`,
      border: `color-mix(in oklab, ${AZURE} 32%, var(--border))`,
      strip: `color-mix(in oklab, ${AZURE} 12%, transparent)`,
      stripBorder: `color-mix(in oklab, ${AZURE} 26%, var(--border))`,
      pill: `color-mix(in oklab, ${AZURE} 16%, transparent)`,
    }
  }

  return {
    color: GOLD,
    bg: `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`,
    border: `color-mix(in oklab, ${GOLD} 38%, var(--border))`,
    strip: `color-mix(in oklab, ${GOLD} 14%, transparent)`,
    stripBorder: `color-mix(in oklab, ${GOLD} 30%, var(--border))`,
    pill: `color-mix(in oklab, ${GOLD} 22%, transparent)`,
  }
}

// ── Props ────────────────────────────────────────────────────────
export interface PendingCardBProps {
  floor: number
  ceiling?: number | null
  tier: string
  vendor: string
  kind: 'community' | 'boxoffice'
  submitter: { handle: string; url: string } | null
  submittedAt: string
  confirms: number
  needed: number
  view: 'other' | 'submitter' | 'self-locked'
  note?: string | null
  onConfirm: () => void
  onWithdraw: () => void
  onEdit: () => void
}

// ── Component ────────────────────────────────────────────────────
export const PendingCardB = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  submittedAt,
  view,
  note,
  confirms,
  needed,
  onConfirm,
  onWithdraw,
  onEdit,
}: PendingCardBProps) => {
  const tok = pendingTokens(kind)
  const isBox = kind === 'boxoffice'
  const isSubmitter = view === 'submitter' || view === 'self-locked'
  const remaining = needed - confirms

  // ── Card background / border ─────────────────────────────────
  const cardStyle = isBox
    ? {
        borderRadius: '12px',
        overflow: 'hidden' as const,
        padding: 0,
        background: tok.bg,
        border: `1px solid ${tok.border}`,
        boxShadow: `inset 0 1px 0 color-mix(in oklab, ${GOLD} 40%, transparent)`,
      }
    : {
        borderRadius: '12px',
        overflow: 'hidden' as const,
        padding: 0,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        boxShadow: 'none',
      }

  return (
    <div style={cardStyle}>
      {/* ── Pending strip ── */}
      <div
        style={{
          padding: '8px 14px',
          background: tok.strip,
          borderBottom: `1px solid ${tok.stripBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {/* Strip left group */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9.5px',
            color: tok.color,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span>{copy.pending}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: 'inline-flex', gap: '3px' }}>
            {Array.from({ length: needed }).map((_, idx) => (
              <PendingDot
                key={idx}
                size={7}
                filled={idx < confirms}
                color={tok.color}
              />
            ))}
          </span>
          <span>
            {confirms} {copy.of} {needed} {copy.confirmed}
          </span>
        </div>

        {/* Strip right */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {remaining} {copy.toGo}
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 16px 14px' }}>
        {/* Top row (eyebrow row) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Eyebrow color={isBox ? tok.color : 'var(--fg-subtle)'}>
            {isBox ? copy.boxOfficeLabel : copy.ticketsLabel}
          </Eyebrow>
        </div>

        {/* Box-office sub-tier line */}
        {isBox && (
          <div
            style={{
              marginTop: '4px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              color: tok.color,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              fontWeight: 700,
            }}
          >
            {vendor}
          </div>
        )}

        {/* Headline row */}
        <div
          style={{
            marginTop: '6px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: '28px',
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            {ceiling != null && ceiling > floor
              ? `$${floor}–$${ceiling}`
              : `$${floor}`}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: 'var(--fg-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {tier}
          </span>
          {isBox && (
            <span
              style={{
                fontFamily: 'Inter, system-ui',
                fontWeight: 600,
                fontSize: '12px',
                color: tok.color,
                letterSpacing: '-0.005em',
              }}
            >
              {copy.faceValueNoFees}
            </span>
          )}
          <PendingTrustPill kind={kind} />
        </div>

        {/* Vendor line */}
        <div
          style={{
            marginTop: '6px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {copy.seenOnPrefix} {vendor}
        </div>

        {/* Attribution line */}
        <div
          style={{
            marginTop: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          <span>{copy.submittedByPrefix}</span>
          {isSubmitter ? (
            <span style={{ color: tok.color, fontWeight: 700 }}>
              {copy.you}
            </span>
          ) : submitter !== null ? (
            <a
              href={submitter.url}
              style={{
                color: 'var(--fg-muted)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--border-strong)',
                textUnderlineOffset: '2px',
              }}
            >
              {submitter.handle}
            </a>
          ) : (
            <span style={{ fontStyle: 'italic', opacity: 0.85 }}>
              {copy.anonymousFan}
            </span>
          )}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{formatTimeAgo(submittedAt)}</span>
        </div>

        {/* Optional note */}
        {note != null && note !== '' && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontFamily: 'Inter, system-ui',
              fontSize: '12.5px',
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
              lineHeight: 1.45,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{note}&rdquo;
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {view === 'other' && (
            <>
              <button
                onClick={onEdit}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.sawDifferentNumber}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: tok.color,
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  letterSpacing: '-0.005em',
                }}
              >
                <CheckGlyph size={11} color="var(--fg-on-accent)" />
                {copy.confirmPrice}
              </button>
            </>
          )}

          {view === 'self-locked' && (
            <>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.yourSubmissionLabel}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
                  border: '1px dashed var(--border-strong)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--fg-muted)',
                  letterSpacing: '-0.005em',
                }}
              >
                <LockGlyph size={14} />
                {copy.waitingOnOneFan}
              </span>
            </>
          )}

          {view === 'submitter' && (
            <>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.yourSubmissionLabel}
              </span>
              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  onClick={onEdit}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--signal)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {copy.editButton}
                </button>
                <button
                  onClick={onWithdraw}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: 'var(--warning)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {copy.withdrawButton}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
