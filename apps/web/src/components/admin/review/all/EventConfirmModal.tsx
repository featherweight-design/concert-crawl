'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton, AdminDialog } from '@/components/admin/primitives'

type ConfirmKind = 'delete' | 'non-concert' | 'mark-as-concert'

// Only the four identity fields are read for rendering — keeping the prop
// structural lets non-AllEvent callers (the editor's DangerZone) reuse
// this modal without round-tripping through the table row shape.
export interface EventConfirmEvent {
  title: string
  venueName: string | null
  date: string
  showTime: string | null
}

export interface EventConfirmModalProps {
  kind: ConfirmKind
  event: EventConfirmEvent
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

const COPY = ADMIN_COPY.review.allEvents
const COPY_CLASSIFICATION = ADMIN_COPY.editor.classification

export const EventConfirmModal = ({
  kind,
  event,
  onCancel,
  onConfirm,
  pending = false,
}: EventConfirmModalProps) => {
  const isDelete = kind === 'delete'
  const isMarkAsConcert = kind === 'mark-as-concert'
  const copy = isDelete
    ? COPY.deleteConfirm
    : isMarkAsConcert
      ? COPY_CLASSIFICATION.markAsConcertConfirm
      : COPY.nonConcertConfirm
  const accent = isDelete
    ? 'var(--danger)'
    : isMarkAsConcert
      ? 'var(--success)'
      : 'var(--warning)'
  return (
    <AdminDialog
      accent={accent}
      label={copy.heading}
      eyebrow={copy.eyebrow}
      heading={copy.heading}
      width={460}
      // Block dismissal while a mutation is in flight so the modal can't
      // disappear mid-request, leaving the action running silently.
      dismissible={!pending}
      onDismiss={onCancel}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {copy.cancel}
          </AdminButton>
          <AdminButton
            variant={
              isDelete ? 'danger' : isMarkAsConcert ? 'success' : 'outline'
            }
            onClick={onConfirm}
            disabled={pending}
          >
            {copy.confirm}
          </AdminButton>
        </>
      }
    >
      <div
        style={{
          marginTop: 12,
          padding: '11px 13px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 9,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
          {event.venueName ?? '—'} · {event.date}
          {event.showTime ? ` · ${event.showTime}` : ''}
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--fg-muted)',
          lineHeight: 1.6,
        }}
      >
        {copy.body}
      </div>
    </AdminDialog>
  )
}
