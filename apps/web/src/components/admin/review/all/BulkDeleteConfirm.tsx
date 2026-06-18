'use client'

import { useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={COPY.heading(count)}
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
          borderTop: '3px solid var(--danger)',
          border:
            '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
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
              color: 'var(--danger)',
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
            {COPY.heading(count)}
          </h3>
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
              autoFocus
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
            variant="danger"
            onClick={onConfirm}
            disabled={pending || !armed}
          >
            {COPY.confirm(count)}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
