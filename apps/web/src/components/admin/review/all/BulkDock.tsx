'use client'

import { Flag, RefreshCw, Trash2, X } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'

const COPY = ADMIN_COPY.review.allEvents.bulkDock

export interface BulkDockProps {
  count: number
  onUnverify: () => void
  onMarkNonConcert: () => void
  onDelete: () => void
  onClear: () => void
  pending?: boolean
}

export const BulkDock = ({
  count,
  onUnverify,
  onMarkNonConcert,
  onDelete,
  onClear,
  pending = false,
}: BulkDockProps) => {
  if (count === 0) return null
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      style={{
        position: 'sticky',
        bottom: 16,
        alignSelf: 'center',
        marginInline: 'auto',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px 9px 16px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 13,
        boxShadow: '0 18px 48px rgba(0,0,0,0.34), 0 3px 10px rgba(0,0,0,0.18)',
      }}
    >
      <span
        style={{
          minWidth: 24,
          height: 24,
          padding: '0 8px',
          borderRadius: 12,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--fg)',
        }}
      >
        {COPY.selectedCount(count).replace(`${count} `, '')}
      </span>
      <span style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <AdminButton
        type="button"
        variant="ghost"
        size="sm"
        icon={RefreshCw}
        onClick={onUnverify}
        disabled={pending}
      >
        {COPY.sendBackToReview}
      </AdminButton>
      <AdminButton
        type="button"
        variant="ghost"
        size="sm"
        icon={Flag}
        onClick={onMarkNonConcert}
        disabled={pending}
      >
        {COPY.markNonConcert}
      </AdminButton>
      <AdminButton
        type="button"
        variant="danger"
        size="sm"
        icon={Trash2}
        onClick={onDelete}
        disabled={pending}
      >
        {COPY.delete(count)}
      </AdminButton>
      <button
        type="button"
        aria-label={COPY.clear}
        onClick={onClear}
        disabled={pending}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: pending ? 'default' : 'pointer',
          color: 'var(--fg-subtle)',
          padding: 6,
          borderRadius: 6,
          display: 'inline-flex',
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
