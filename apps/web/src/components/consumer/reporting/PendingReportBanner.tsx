'use client'

import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'
import { CheckGlyph, LockGlyph } from '../glyphs'

// ── Kind glyphs at 14×14 ──────────────────────────────────────────

const CancelledGlyph14 = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="5"
      cy="5"
      r="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3 3 L7 7 M7 3 L3 7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph14 = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="5"
      cy="5"
      r="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M5 3 L5 5 L6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const LinkChainIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"
      stroke="var(--fg-muted)"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const copy = REPORTING_COPY.pendingReportBanner

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const EVIDENCE_METHOD_LABELS: Record<string, string> = {
  bought_myself: 'First-hand',
  saw_listing: 'Saw listing',
  venue_site: 'Venue site',
  other: 'Other',
}

// ── Props ─────────────────────────────────────────────────────────

export interface PendingReportBannerProps {
  kind: 'cancelled' | 'postponed'
  confirms: number
  needed: number
  view: 'other' | 'reporter' | 'self-locked'
  reportedAt: string // ISO
  evidenceMethod?: string
  evidenceUrl?: string | null
  reporter: { handle: string; url: string } | null
  onConfirm: () => void
  onWithdraw: () => void
  onEdit: () => void
  onAddEvidence: () => void
  onSawDifferent: () => void
}

// ── Component ─────────────────────────────────────────────────────

export const PendingReportBanner = ({
  kind,
  confirms,
  needed,
  view,
  reportedAt,
  evidenceMethod,
  evidenceUrl,
  reporter,
  onConfirm,
  onWithdraw,
  onAddEvidence,
  onSawDifferent,
}: PendingReportBannerProps) => {
  const tokens = REPORT_TOKENS[kind]
  const timeAgo = formatTimeAgo(reportedAt)
  const isReporter = view === 'reporter' || view === 'self-locked'

  const badgeLabel =
    kind === 'cancelled' ? copy.cancelledBadge : copy.postponedBadge

  const leadText =
    kind === 'cancelled' ? copy.cancelledLead : copy.postponedLead

  const evidenceLabel = evidenceUrl
    ? evidenceUrl
    : evidenceMethod
      ? (EVIDENCE_METHOD_LABELS[evidenceMethod] ?? evidenceMethod)
      : null

  return (
    <div
      style={{
        borderRadius: 12,
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Top strip — kind label + dot tracker */}
      <div
        style={{
          padding: '10px 14px',
          background: tokens.bgStrong,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: kind label */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {kind === 'cancelled' ? <CancelledGlyph14 /> : <PostponedGlyph14 />}
          {badgeLabel}
        </span>

        {/* Right: dot tracker */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: tokens.color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {Array.from({ length: needed }).map((_, idx) => (
            <span
              key={idx}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: idx < confirms ? tokens.color : 'transparent',
                border: `1.1px solid ${tokens.color}`,
                display: 'inline-block',
              }}
            />
          ))}
          <span style={{ marginLeft: 4 }}>
            {confirms} of {needed}
          </span>
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        {/* Lead text */}
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 14.5,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            margin: '0 0 10px',
            lineHeight: 1.4,
          }}
        >
          {leadText}
        </p>

        {/* Evidence card */}
        {evidenceLabel !== null && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LinkChainIcon />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 12.5,
                color: 'var(--fg)',
                letterSpacing: '-0.005em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {evidenceLabel}
            </span>
            {evidenceUrl ? (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                VIEW
              </a>
            ) : (
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  opacity: 0.4,
                  flexShrink: 0,
                }}
              >
                VIEW
              </span>
            )}
          </div>
        )}

        {/* Attribution */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          <span>Reported by</span>
          {isReporter ? (
            <span style={{ color: tokens.color, fontWeight: 700 }}>you</span>
          ) : reporter !== null ? (
            <a
              href={reporter.url ?? '#'}
              style={{
                textDecoration: 'underline',
                textDecorationColor: 'var(--border-strong)',
                color: 'inherit',
              }}
            >
              {reporter.handle}
            </a>
          ) : (
            <span>{copy.reportedAnonymously}</span>
          )}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{timeAgo}</span>
        </div>

        {/* Action row — inside body, separated by borderTop */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {view === 'other' && (
            <>
              <button
                type="button"
                onClick={onSawDifferent}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.footerQuestion}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: tokens.color,
                  color: 'var(--fg-on-accent)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: 12.5,
                  letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                <CheckGlyph size={11} color="var(--fg-on-accent)" />
                {copy.confirmButton}
              </button>
            </>
          )}

          {view === 'reporter' && (
            <>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.yourReportLabel}
              </span>

              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  type="button"
                  onClick={onAddEvidence}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--signal)',
                    lineHeight: 1,
                  }}
                >
                  {copy.addEvidenceButton}
                </button>

                <button
                  type="button"
                  onClick={onWithdraw}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--warning)',
                    lineHeight: 1,
                  }}
                >
                  {copy.withdrawButton}
                </button>
              </div>
            </>
          )}

          {view === 'self-locked' && (
            <div
              style={{
                background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 8,
                padding: '7px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: 'auto',
              }}
            >
              <LockGlyph size={10} />
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  lineHeight: 1,
                }}
              >
                {copy.waitingForConfirms}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
