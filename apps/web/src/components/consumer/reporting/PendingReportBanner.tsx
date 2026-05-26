'use client'

import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'

const copy = REPORTING_COPY.pendingReportBanner

// ── Props ─────────────────────────────────────────────────────────

export interface PendingReportBannerProps {
  kind: 'cancelled' | 'postponed'
  confirms: number
  needed: number
  view: 'other' | 'reporter' | 'self-locked'
  reportedAt: string // ISO
  evidenceMethod?: string
  reporter: { handle: string; url: string } | null
  onConfirm: () => void
  onWithdraw: () => void
  onEdit: () => void
  onAddEvidence: () => void
}

// ── Component ─────────────────────────────────────────────────────

export const PendingReportBanner = ({
  kind,
  confirms,
  needed,
  view,
  evidenceMethod,
  reporter,
  onConfirm,
  onWithdraw,
  onAddEvidence,
}: PendingReportBannerProps) => {
  const tokens = REPORT_TOKENS[kind]

  const badgeLabel =
    kind === 'cancelled' ? copy.cancelledBadge : copy.postponedBadge

  const leadText =
    kind === 'cancelled' ? copy.cancelledLead : copy.postponedLead

  const reporterHandle = reporter
    ? copy.reportedBy(reporter.handle)
    : copy.reportedAnonymously

  const attributionLine = evidenceMethod
    ? `${reporterHandle} · ${evidenceMethod}`
    : reporterHandle

  return (
    <div
      style={{
        borderRadius: 12,
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Top strip */}
      <div
        style={{
          padding: '10px 14px',
          background: tokens.bgStrong,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* Left: badge */}
        <span
          style={{
            background: tokens.bg,
            border: `1px solid color-mix(in oklab, ${tokens.color} 50%, transparent)`,
            borderRadius: 4,
            padding: '2px 7px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: tokens.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {badgeLabel}
        </span>

        {/* Right: confirms progress */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg-subtle)',
            whiteSpace: 'nowrap',
          }}
        >
          {copy.confirmsProgress(confirms, needed)}{' '}
          <span style={{ opacity: 0.4 }}>{copy.confirmsToGo}</span>
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
            lineHeight: 1.3,
          }}
        >
          {leadText}
        </p>

        {/* Evidence card */}
        <div
          style={{
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-muted)',
              letterSpacing: '0.04em',
              lineHeight: 1.4,
            }}
          >
            {attributionLine}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: `1px solid ${tokens.border}`,
        }}
      >
        {view === 'other' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {copy.footerQuestion}
            </span>

            <button
              type="button"
              onClick={onConfirm}
              style={{
                all: 'unset',
                cursor: 'pointer',
                background: tokens.color,
                color: 'var(--fg-on-accent)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '7px 12px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {copy.confirmButton}
            </button>
          </div>
        )}

        {view === 'reporter' && (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginBottom: 8,
              }}
            >
              {copy.yourReportLabel}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
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
          </div>
        )}

        {view === 'self-locked' && (
          <div
            style={{
              background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 8,
              padding: '6px 10px',
              display: 'inline-block',
            }}
          >
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
  )
}
