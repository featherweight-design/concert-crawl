'use client'

import { type MovedReason } from '@concert-crawl/types'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { formatEventDate } from '@/lib/admin/missing'

const COPY = ADMIN_COPY.review.missing.moveConfirm

export interface MoveConfirmDialogProps {
  missingTitle: string
  missingDate: string
  missingVenueName: string | null
  candidateTitle: string
  candidateDate: string
  candidateVenueName: string | null
  reason: MovedReason
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

const line = (title: string, date: string, venueName: string | null): string =>
  [title, formatEventDate(date), venueName ?? '—'].join(' · ')

/**
 * Confirm step for a suggested relocation. Deliberately not the typed-token
 * treatment `BulkDeleteConfirm` uses — that guards an unbounded delete, this
 * is one row — but it is still a dialog rather than a one-click, because the
 * merge deletes a row, moves watch rows, and pushes a notification to every
 * watcher. None of those are reversible, so the admin reads what they are
 * about to do first.
 */
export const MoveConfirmDialog = ({
  missingTitle,
  missingDate,
  missingVenueName,
  candidateTitle,
  candidateDate,
  candidateVenueName,
  reason,
  onCancel,
  onConfirm,
  pending = false,
}: MoveConfirmDialogProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={COPY.heading}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}
    onClick={(evt) => {
      if (pending) return
      if (evt.target === evt.currentTarget) onCancel()
    }}
  >
    <div
      style={{
        width: 520,
        maxWidth: '100%',
        background: 'var(--bg-elevated)',
        borderTop: '3px solid var(--warning)',
        border:
          '1px solid color-mix(in oklab, var(--warning) 30%, transparent)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '22px 24px 14px' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--warning)',
          }}
        >
          {COPY.eyebrow}
        </div>
        <h3
          style={{
            margin: '9px 0 0',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {COPY.heading}
        </h3>
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {COPY.fromLabel}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>
              {line(missingTitle, missingDate, missingVenueName)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {COPY.toLabel}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>
              {line(candidateTitle, candidateDate, candidateVenueName)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {reason === 'date' ? COPY.reasonDate : COPY.reasonVenue}
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 13,
            color: 'var(--fg-muted)',
            lineHeight: 1.6,
          }}
        >
          {COPY.body}
        </div>
      </div>
      <div
        style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          background: 'var(--surface-1)',
        }}
      >
        <AdminButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          {COPY.cancel}
        </AdminButton>
        <AdminButton
          type="button"
          variant="primary"
          onClick={onConfirm}
          disabled={pending}
        >
          {COPY.confirm}
        </AdminButton>
      </div>
    </div>
  </div>
)
