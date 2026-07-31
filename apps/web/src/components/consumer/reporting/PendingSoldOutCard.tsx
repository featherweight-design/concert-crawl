'use client'

import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'
import { CheckGlyph, Eyebrow, PendingDot } from '@/components/consumer/glyphs'
import { isHttpUrl } from '@/lib/url'

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
  userHasConfirmed?: boolean
  evidenceMethod?: string | null
  evidenceUrl?: string | null
  note?: string | null
  onConfirm: () => void
  onWithdraw: () => void
  onEdit: () => void
  onSawDifferent?: () => void
}

// ── Component ─────────────────────────────────────────────────────

const evidenceLabel = (
  method: string | null | undefined,
  vendor: string,
  note: string | null | undefined,
): string => {
  let base: string
  switch (method) {
    case 'saw_listing':
      base = `${vendor} listing`
      break
    case 'venue_site':
      base = 'Venue website'
      break
    case 'bought_myself':
      base = 'Bought personally'
      break
    default:
      base = 'Community evidence'
  }
  return note ? `${base} · '${note}'` : base
}

export const PendingSoldOutCard = ({
  floor,
  ceiling,
  vendor,
  reporter,
  reportedAt,
  confirms,
  needed,
  view,
  userHasConfirmed = false,
  evidenceMethod,
  evidenceUrl,
  note,
  onConfirm,
  onWithdraw,
  onEdit,
  onSawDifferent,
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
        {/* Left: kind label (icon + text, borderless like PendingReportBanner) */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
            />
            <path
              d="M3.5 8.5L8.5 3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {copy.stripBadge}
        </span>

        {/* Right: dot tracker + "N of M" (matching PendingCardB / PendingReportBanner) */}
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
            <PendingDot
              key={idx}
              size={7}
              filled={idx < confirms}
              color={tokens.color}
            />
          ))}
          <span style={{ marginLeft: 4 }}>
            {copy.confirmsProgress(confirms, needed)}
          </span>
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 14px 12px' }}>
        {/* Tickets eyebrow */}
        <Eyebrow>Tickets</Eyebrow>

        {/* Price row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
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

          {/* Sold out pill — bottom-aligned in the price row */}
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
              alignSelf: 'flex-end',
            }}
          >
            {copy.soldOutPill}
          </span>
        </div>

        {/* Evidence row */}
        {(evidenceMethod || evidenceUrl) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 10,
              padding: '7px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-muted)',
                letterSpacing: '0.04em',
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {evidenceLabel(evidenceMethod, vendor, note)}
            </span>
            {evidenceUrl && isHttpUrl(evidenceUrl) && (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                {copy.viewLink}
              </a>
            )}
          </div>
        )}

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
        {view === 'other' && !userHasConfirmed && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onSawDifferent}
              style={{
                all: 'unset',
                cursor: onSawDifferent ? 'pointer' : 'default',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                flexShrink: 1,
                minWidth: 0,
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
              <CheckGlyph size={11} color="var(--fg-on-accent)" />
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
