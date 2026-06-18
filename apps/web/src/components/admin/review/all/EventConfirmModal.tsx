'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'
import { type AllEvent } from './types'

type ConfirmKind = 'delete' | 'non-concert'

export interface EventConfirmModalProps {
  kind: ConfirmKind
  event: AllEvent
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

const COPY = ADMIN_COPY.review.allEvents

export const EventConfirmModal = ({
  kind,
  event,
  onCancel,
  onConfirm,
  pending = false,
}: EventConfirmModalProps) => {
  const isDelete = kind === 'delete'
  const copy = isDelete ? COPY.deleteConfirm : COPY.nonConcertConfirm
  const accent = isDelete ? 'var(--danger)' : 'var(--warning)'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
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
        // Block scrim dismissal while a mutation is in flight so the modal
        // can't disappear mid-request, leaving the action running silently.
        if (pending) return
        if (evt.target === evt.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          borderTop: `3px solid ${accent}`,
          border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
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
              color: accent,
            }}
          >
            {copy.eyebrow}
          </div>
          <h3
            style={{
              margin: '9px 0 0',
              fontSize: 21,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {copy.heading}
          </h3>
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
            <div
              style={{
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginTop: 2,
              }}
            >
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
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {copy.cancel}
          </AdminButton>
          <AdminButton
            variant={isDelete ? 'danger' : 'outline'}
            onClick={onConfirm}
            disabled={pending}
          >
            {copy.confirm}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
