'use client'

import { REPORT_TOKENS } from './reportTokens'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.reportTypeMark

// ── Glyphs ────────────────────────────────────────────────────────

const CancelledGlyph = () => (
  <svg
    width="10"
    height="10"
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

const PostponedGlyph = () => (
  <svg
    width="10"
    height="10"
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

const SoldOutGlyph = () => (
  <svg
    width="10"
    height="10"
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

const AvailableGlyph = () => (
  <svg
    width="10"
    height="10"
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
      d="M3.5 5 L4.5 6 L6.5 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
        opacity: pending ? 0.4 : 1,
      }}
    >
      <Glyph />
      {pending && (
        <span aria-hidden="true" style={{ marginRight: '1px' }}>
          {copy.pendingDot}
        </span>
      )}
      {token.label}
    </span>
  )
}
