'use client'

import { useEffect } from 'react'
import {
  MonoLabel,
  AdminButton,
  ConfidenceBar,
} from '@/components/admin/primitives'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

interface BulkApproveConfirmProps {
  events: EventFlag[]
  onConfirm: () => void
  onCancel: () => void
}

const PREVIEW_LIMIT = 5

export const BulkApproveConfirm = ({
  events,
  onConfirm,
  onCancel,
}: BulkApproveConfirmProps) => {
  const previewEvents = events.slice(0, PREVIEW_LIMIT)
  const extraCount = events.length - PREVIEW_LIMIT

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    /* Overlay / scrim */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-approve-title"
        style={{
          width: 520,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
        onClick={(evt) => evt.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <MonoLabel>bulk approve</MonoLabel>
          <h3
            id="bulk-approve-title"
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '6px 0 0',
              color: 'var(--fg)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Approve {events.length} event{events.length !== 1 ? 's' : ''}?
          </h3>
        </div>

        {/* Event preview list */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--surface-1)',
            margin: '16px 22px',
          }}
        >
          {previewEvents.map((ev, idx) => (
            <div
              key={ev.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                padding: '8px 12px',
                borderBottom:
                  idx < previewEvents.length - 1 || extraCount > 0
                    ? '1px solid var(--border)'
                    : 'none',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {ev.title}
              </div>
              <div style={{ minWidth: 96 }}>
                <ConfidenceBar score={ev.confidenceScore ?? 0} />
              </div>
            </div>
          ))}
          {extraCount > 0 && (
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--fg-muted)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              +{extraCount} more event{extraCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Warning strip */}
        <div
          style={{
            margin: '12px 22px 16px',
            padding: '10px 12px',
            background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
            border:
              '1px solid color-mix(in oklab, var(--warning) 28%, transparent)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--warning)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          These events will be marked as verified and visible to users.
        </div>

        {/* Action shelf */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            background: 'var(--surface-1)',
            borderRadius: '0 0 14px 14px',
          }}
        >
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="success" onClick={onConfirm}>
            Approve all
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
