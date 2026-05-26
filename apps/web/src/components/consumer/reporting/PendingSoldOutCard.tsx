'use client'

import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'

const copy = REPORTING_COPY.pendingSoldOutCard
const tokens = REPORT_TOKENS['sold-out']

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Props ─────────────────────────────────────────────────────────

export interface PendingSoldOutCardProps {
  floor: number
  ceiling?: number
  vendor: string
  reporter: { handle: string; url: string } | null
  reportedAt: string // ISO
  confirms: number
  needed: number
  view: 'other' | 'reporter' // NO self-locked for sold-out per design
  onConfirm: () => void
  onWithdraw: () => void
  onEdit: () => void
}

// ── Component ─────────────────────────────────────────────────────

export const PendingSoldOutCard = ({
  floor,
  ceiling,
  vendor,
  reporter,
  reportedAt,
  confirms,
  needed,
  view,
  onConfirm,
  onWithdraw,
  onEdit,
}: PendingSoldOutCardProps) => {
  const timeAgo = formatTimeAgo(reportedAt)

  const priceStr = ceiling != null ? `$${floor}–$${ceiling}` : `$${floor}`

  const attributionText = reporter
    ? copy.reportedBy(reporter.handle)
    : copy.reportedAnonymously

  return (
    <div
      style={{
        borderRadius: 12,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Top pending strip */}
      <div
        style={{
          padding: '8px 14px',
          background: tokens.bgStrong,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* Pending badge */}
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
          {copy.stripBadge}
        </span>

        {/* Confirms progress */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg-subtle)',
            whiteSpace: 'nowrap',
          }}
        >
          {copy.confirmsProgress(confirms, needed)}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 14px 12px' }}>
        {/* Price row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {/* Strikethrough price */}
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 28,
              color: 'var(--fg-subtle)',
              textDecoration: 'line-through',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            {priceStr}
          </span>

          {/* Sold out pill */}
          <span
            style={{
              background: tokens.color,
              borderRadius: 4,
              padding: '2px 7px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--fg-on-accent)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              alignSelf: 'center',
            }}
          >
            {copy.soldOutPill}
          </span>
        </div>

        {/* Vendor */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
            marginTop: 4,
          }}
        >
          {vendor}
        </div>

        {/* Reporter attribution */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
            marginTop: 6,
          }}
        >
          {attributionText} · {timeAgo}
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
                fontSize: 9,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                flexShrink: 1,
                minWidth: 0,
                textTransform: 'uppercase',
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
                onClick={onEdit}
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
      </div>
    </div>
  )
}
