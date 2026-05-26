'use client'

import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.reportFooterLink

export interface ReportFooterLinkProps {
  liveStatus: null | 'sold-out' | 'cancelled' | 'postponed'
  onOpen: () => void
}

export const ReportFooterLink = ({
  liveStatus: _liveStatus,
  onOpen,
}: ReportFooterLinkProps) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '393px',
        padding: '24px 18px 32px',
        borderTop: '1px dashed var(--border)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        boxSizing: 'border-box',
      }}
    >
      {/* Eyebrow */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--fg-subtle)',
          margin: '0 0 10px',
        }}
      >
        {copy.eyebrow}
      </p>

      {/* Button row */}
      <button
        onClick={onOpen}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          >
            {copy.title}
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {copy.subtitle}
          </span>
        </div>

        {/* Arrow icon */}
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            color: 'var(--fg-muted)',
            marginLeft: '8px',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          →
        </span>
      </button>

      {/* Bottom note */}
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          color: 'var(--fg-subtle)',
          margin: '10px 0 0',
          lineHeight: 1.5,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {copy.bottomNote}
      </p>
    </div>
  )
}
