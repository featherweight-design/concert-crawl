'use client'

import { useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton, AdminDialog } from '@/components/admin/primitives'

const COPY = ADMIN_COPY.review.allEvents.bulkDeleteConfirm

const TYPED_TOKEN = 'DELETE'

export interface BulkDeleteConfirmProps {
  count: number
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

export const BulkDeleteConfirm = ({
  count,
  onCancel,
  onConfirm,
  pending = false,
}: BulkDeleteConfirmProps) => {
  const [typed, setTyped] = useState('')
  const armed = typed === TYPED_TOKEN
  return (
    <AdminDialog
      accent="var(--danger)"
      label={COPY.heading(count)}
      eyebrow={COPY.eyebrow}
      heading={COPY.heading(count)}
      dismissible={!pending}
      onDismiss={onCancel}
      footer={
        <>
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
            variant="danger"
            onClick={onConfirm}
            disabled={pending || !armed}
          >
            {COPY.confirm(count)}
          </AdminButton>
        </>
      }
    >
      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: 'var(--fg-muted)',
          lineHeight: 1.6,
        }}
      >
        {COPY.body}
      </div>
      <div style={{ marginTop: 16 }}>
        <label
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            display: 'block',
            marginBottom: 6,
          }}
        >
          {COPY.typedPrompt}
        </label>
        <input
          value={typed}
          onChange={(evt) => setTyped(evt.target.value)}
          aria-label={COPY.typedInputAriaLabel}
          style={{
            width: '100%',
            height: 36,
            padding: '0 12px',
            borderRadius: 9,
            border: `1px solid ${armed ? 'var(--danger)' : 'var(--border-strong)'}`,
            background: 'var(--surface-1)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: 'var(--fg)',
          }}
        />
      </div>
    </AdminDialog>
  )
}
