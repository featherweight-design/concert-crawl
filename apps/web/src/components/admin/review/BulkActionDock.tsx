'use client'

import { Tag } from 'lucide-react'

interface BulkActionDockProps {
  count: number
  onApproveAll: () => void
  onRejectAll: () => void
  onClear: () => void
  onRetag?: () => void
}

export const BulkActionDock = ({
  count,
  onApproveAll,
  onRejectAll,
  onRetag,
}: BulkActionDockProps) => {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 18,
        alignSelf: 'center',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--ink)',
        borderRadius: 14,
        boxShadow: '0 12px 36px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18)',
        zIndex: 50,
      }}
    >
      {/* Count chip */}
      <span
        style={{
          minWidth: 22,
          height: 22,
          padding: '0 7px',
          borderRadius: 11,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {count}
      </span>

      {/* Label */}
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: 'var(--paper)',
        }}
      >
        selected
      </span>

      {/* Re-tag (optional) */}
      {onRetag && (
        <button
          onClick={onRetag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            cursor: 'pointer',
          }}
        >
          <Tag size={12} />
          Re-tag
        </button>
      )}

      {/* Reject all */}
      <button
        onClick={onRejectAll}
        style={{
          padding: '6px 10px',
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          color: 'color-mix(in oklab, var(--danger) 60%, #fff)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        × Reject all
      </button>

      {/* Approve N */}
      <button
        onClick={onApproveAll}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 8,
          background: 'var(--success)',
          color: 'var(--fg-on-accent)',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ✓ Approve {count}
      </button>
    </div>
  )
}
