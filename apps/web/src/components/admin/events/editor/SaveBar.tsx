'use client'

import { AdminButton } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.editor.saveBar

export interface SaveBarProps {
  dirty: boolean
  saving: boolean
  error?: string | null
  onSave: () => void
  onDiscard: () => void
}

export const SaveBar = ({
  dirty,
  saving,
  error,
  onSave,
  onDiscard,
}: SaveBarProps) => {
  if (!dirty && !saving && !error) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        bottom: 12,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        margin: '12px auto 0',
        maxWidth: 760,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 12,
        boxShadow: '0 18px 48px rgba(0,0,0,0.34), 0 3px 10px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          flex: 1,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: error ? 'var(--danger)' : 'var(--fg)',
        }}
      >
        {error ?? COPY.dirty}
      </div>
      <AdminButton variant="ghost" onClick={onDiscard} disabled={saving}>
        {COPY.discard}
      </AdminButton>
      <AdminButton
        variant="primary"
        onClick={onSave}
        disabled={saving || !dirty}
      >
        {saving ? COPY.saving : COPY.save}
      </AdminButton>
    </div>
  )
}
