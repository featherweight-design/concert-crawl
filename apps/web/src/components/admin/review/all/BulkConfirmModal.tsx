'use client'

import { AdminButton } from '@/components/admin/primitives'

export interface BulkConfirmCopy {
  eyebrow: string
  heading: (count: number) => string
  body: string
  confirm: (count: number) => string
  cancel: string
}

export interface BulkConfirmModalProps {
  copy: BulkConfirmCopy
  count: number
  accent: string
  confirmVariant?: 'danger' | 'outline'
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

export const BulkConfirmModal = ({
  copy,
  count,
  accent,
  confirmVariant = 'outline',
  onCancel,
  onConfirm,
  pending = false,
}: BulkConfirmModalProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={copy.heading(count)}
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
        width: 480,
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
            lineHeight: 1.15,
          }}
        >
          {copy.heading(count)}
        </h3>
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
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={pending}
        >
          {copy.confirm(count)}
        </AdminButton>
      </div>
    </div>
  </div>
)
