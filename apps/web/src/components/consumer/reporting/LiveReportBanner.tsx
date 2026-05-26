'use client'

import { REPORT_TOKENS } from './reportTokens'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.liveReportBanner

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Glyphs (16×16) ────────────────────────────────────────────────

const CancelledGlyph16 = () => (
  <svg
    width="16"
    height="16"
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

const PostponedGlyph16 = () => (
  <svg
    width="16"
    height="16"
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

const SoldOutGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="8"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3.5 3.5 L6.5 6.5 M6.5 3.5 L3.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

type LiveReportStatus = 'sold-out' | 'cancelled' | 'postponed'

const GLYPHS_16: Record<LiveReportStatus, () => React.JSX.Element> = {
  cancelled: CancelledGlyph16,
  postponed: PostponedGlyph16,
  'sold-out': SoldOutGlyph16,
}

// ── Props ─────────────────────────────────────────────────────────

export interface LiveReportBannerProps {
  status: LiveReportStatus
  promotedAt: string // ISO
  confirmCount: number
}

// ── Component ─────────────────────────────────────────────────────

export const LiveReportBanner = ({
  status,
  promotedAt,
  confirmCount,
}: LiveReportBannerProps) => {
  const token = REPORT_TOKENS[status]
  const Glyph = GLYPHS_16[status]
  const timeAgo = formatTimeAgo(promotedAt)

  const headline = copy.headlines[status]

  return (
    <div
      style={{
        borderRadius: '12px',
        background: token.bg,
        border: `1px solid ${token.border}`,
        padding: '12px 14px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: token.bgStrong,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: token.color,
        }}
      >
        <Glyph />
      </div>

      {/* Text column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '15px',
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {headline}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: 'var(--fg-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {copy.confirmsAndTime(confirmCount, timeAgo)}
        </span>
      </div>
    </div>
  )
}
