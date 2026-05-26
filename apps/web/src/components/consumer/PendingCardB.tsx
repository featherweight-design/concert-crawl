'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.pendingCardB

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
  ceiling?: number
  tier: string
  vendor: string
  kind: 'community' | 'boxoffice'
  submitter: { handle: string; url: string } | null
  submittedAt: string // ISO date
  confirms: number
  needed: number
  view: 'other' | 'submitter' | 'self-locked'
  note?: string
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
  view,
  note,
  confirms,
  needed,
  onConfirm,
  onWithdraw,
  onEdit,
}: PendingCardBProps) => {
  const tokens = pendingTokens(kind)
  const remaining = needed - confirms

  // ── Card background / border ─────────────────────────────────
  const cardStyle =
    kind === 'boxoffice'
      ? {
          background: tokens.bg,
          border: `1px solid ${tokens.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          borderRadius: '12px',
        }
      : {
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
        }

  // ── Attribution line ──────────────────────────────────────────
  const attributionNode = (() => {
    if (view === 'submitter') {
      return (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.yourSubmissionAttribution}
        </span>
      )
    }

    if (submitter === null) {
      return (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.viaAnonymous}
        </span>
      )
    }

    return (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          color: 'var(--fg-muted)',
        }}
      >
        {copy.viaHandlePrefix}
        <a
          href={submitter.url}
          style={{ color: 'var(--fg-muted)', textDecoration: 'underline' }}
        >
          {submitter.handle}
        </a>
      </span>
    )
  })()

  // ── Footer ───────────────────────────────────────────────────
  const footerNode = (() => {
    if (view === 'other') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={onConfirm}
            style={{
              background: tokens.color,
              color: 'var(--fg-on-accent)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '12.5px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {copy.confirmPrice}
          </button>
          <button
            onClick={onEdit}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              alignSelf: 'flex-start',
            }}
          >
            {copy.sawDifferentNumber}
          </button>
        </div>
      )
    }

    if (view === 'self-locked') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--fg-muted)',
            }}
          >
            {copy.yourSubmissionLabel}
          </span>
          <div
            style={{
              background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
              border: '1px dashed var(--border-strong)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--fg-muted)',
              display: 'inline-block',
            }}
          >
            {copy.waitingForConfirms}
          </div>
        </div>
      )
    }

    // view === 'submitter'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '12px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.yourSubmissionLabel}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onEdit}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--signal)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {copy.editButton}
          </button>
          <button
            onClick={onWithdraw}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--warning)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {copy.withdrawButton}
          </button>
        </div>
      </div>
    )
  })()

  return (
    <div style={cardStyle}>
      {/* ── Pending strip ── */}
      <div
        style={{
          padding: '8px 14px',
          background: tokens.strip,
          borderBottom: `1px solid ${tokens.stripBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '9.5px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: tokens.color,
          }}
        >
          {copy.stripEyebrowTemplate(confirms, needed)}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.toGoTemplate(remaining)}
        </span>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* Headline price */}
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {ceiling !== undefined ? `$${floor}–${ceiling}` : `$${floor}`}
        </p>

        {/* Tier chip row */}
        <p
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '11px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {tier}
        </p>

        {/* Face value · no fees (box-office only) */}
        {kind === 'boxoffice' && (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: tokens.color,
              margin: 0,
            }}
          >
            {copy.faceValueNoFees}
          </p>
        )}

        {/* Vendor line */}
        <p
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          {vendor}
        </p>

        {/* Attribution */}
        <div>{attributionNode}</div>

        {/* Optional note */}
        {note !== undefined && (
          <div
            style={{
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12.5px',
              fontStyle: 'italic',
            }}
          >
            {note}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '4px' }}>{footerNode}</div>
      </div>
    </div>
  )
}
