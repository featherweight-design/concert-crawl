'use client'

import { type MovedReason } from '@concert-crawl/types'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton, AdminDialog } from '@/components/admin/primitives'
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
}

const LABEL_STYLE = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
} as const

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
}: MoveConfirmDialogProps) => (
  <AdminDialog
    accent="var(--warning)"
    label={COPY.heading}
    eyebrow={COPY.eyebrow}
    heading={COPY.heading}
    onDismiss={onCancel}
    footer={
      <>
        <AdminButton type="button" variant="ghost" onClick={onCancel}>
          {COPY.cancel}
        </AdminButton>
        <AdminButton type="button" variant="primary" onClick={onConfirm}>
          {COPY.confirm}
        </AdminButton>
      </>
    }
  >
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div>
        <div style={LABEL_STYLE}>{COPY.fromLabel}</div>
        <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 3 }}>
          {line(missingTitle, missingDate, missingVenueName)}
        </div>
      </div>
      <div>
        <div style={LABEL_STYLE}>{COPY.toLabel}</div>
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
  </AdminDialog>
)
