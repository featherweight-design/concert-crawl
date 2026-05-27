'use client'

import { REPORT_TOKENS } from './reportTokens'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.reportTypeMark

// ── Glyphs ────────────────────────────────────────────────────────

const CancelledGlyph = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M3 3l6 6M9 3L3 9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.3"
      fill="none"
    />
    <path
      d="M6 3.5V6l2 1.4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SoldOutGlyph = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
)

const AvailableGlyph = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M2 5a1.5 1.5 0 010 3v2h8V8a1.5 1.5 0 010-3V3H2v2z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path
      d="M5 5v3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeDasharray="1.2 1.6"
    />
  </svg>
)

const GLYPHS: Record<ReportTypeMarkProps['kind'], () => React.JSX.Element> = {
  cancelled: CancelledGlyph,
  postponed: PostponedGlyph,
  'sold-out': SoldOutGlyph,
  available: AvailableGlyph,
}

// ── Props ─────────────────────────────────────────────────────────

export interface ReportTypeMarkProps {
  kind: 'cancelled' | 'postponed' | 'sold-out' | 'available'
  pending?: boolean
}

// ── Component ─────────────────────────────────────────────────────

export const ReportTypeMark = ({
  kind,
  pending = false,
}: ReportTypeMarkProps) => {
  const token = REPORT_TOKENS[kind]
  const Glyph = GLYPHS[kind]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 7px',
        borderRadius: '4px',
        background: token.bg,
        color: token.color,
        border: `1px solid color-mix(in oklab, ${token.color} 50%, transparent)`,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <Glyph />
      {token.label}
      {pending && <span aria-hidden="true">{copy.pendingDot} pending</span>}
    </span>
  )
}
