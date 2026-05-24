'use client'

import { TriangleAlert } from 'lucide-react'
import {
  confidenceColor,
  KIND_COLORS,
} from '@/components/admin/primitives/utils'
import { REVIEW_COPY } from './definitions/copy'

interface EventSummary {
  id: string
  title: string
  venueName: string | null
  date: string
  confidenceScore: number | null
}

interface BulkApproveModalProps {
  events: EventSummary[]
  onConfirm: () => void
  onCancel: () => void
}

const LOW_CONFIDENCE_THRESHOLD = 0.7

function formatEventDate(iso: string): string {
  try {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' },
    )
  } catch {
    return iso
  }
}

export const BulkApproveModal = ({
  events,
  onConfirm,
  onCancel,
}: BulkApproveModalProps) => {
  const lowConfidenceCount = events.filter(
    (ev) => (ev.confidenceScore ?? 0) < LOW_CONFIDENCE_THRESHOLD,
  ).length

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 22px 16px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              marginBottom: 8,
            }}
          >
            {REVIEW_COPY.bulkApproveModal.eyebrow}
          </div>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              margin: '0 0 6px',
            }}
          >
            {REVIEW_COPY.bulkApproveModal.heading(events.length)}
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: 'var(--fg-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {REVIEW_COPY.bulkApproveModal.subtext}
          </p>
        </div>

        {/* Event list */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              padding: '8px 22px 6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {REVIEW_COPY.bulkApproveModal.aboutToApprove}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {events.map((ev) => {
              const score = ev.confidenceScore ?? 0
              const kind = confidenceColor(score)
              const barColor = KIND_COLORS[kind].fg

              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 22px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--fg)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                      }}
                    >
                      {[ev.venueName, formatEventDate(ev.date)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>

                  {/* Mini confidence bar + score */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 3,
                        background: 'var(--surface-2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${score * 100}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: barColor,
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 28,
                        textAlign: 'right',
                      }}
                    >
                      {score.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Low confidence warning */}
        {lowConfidenceCount > 0 && (
          <div
            style={{
              margin: '14px 22px 0',
              padding: '10px 14px',
              borderRadius: 8,
              background:
                'color-mix(in oklab, var(--warning) 10%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 30%, transparent)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <TriangleAlert
              size={14}
              color="var(--warning)"
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--warning)',
                lineHeight: 1.5,
              }}
            >
              {REVIEW_COPY.bulkApproveModal.lowConfidenceWarning(
                lowConfidenceCount,
              )}
            </span>
          </div>
        )}

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            padding: '16px 22px 20px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--fg-muted)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {REVIEW_COPY.bulkApproveModal.cancel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--success)',
              border: 'none',
              color: 'var(--fg-on-accent)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {REVIEW_COPY.bulkApproveModal.confirmApprove(events.length)}
          </button>
        </div>
      </div>
    </>
  )
}
