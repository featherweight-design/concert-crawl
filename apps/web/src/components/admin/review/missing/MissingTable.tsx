'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import { MissingRow, type MissingRowEvent } from './MissingRow'

export interface MissingTableProps {
  events: MissingRowEvent[]
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  pendingIds: ReadonlySet<string>
}

export const MissingTable = ({
  events,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  pendingIds,
}: MissingTableProps) => {
  if (events.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: 'color-mix(in oklab, var(--success) 14%, transparent)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={18} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            {ADMIN_COPY.review.missing.emptyHeading}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {ADMIN_COPY.review.missing.emptyBody}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
            }}
          >
            {ADMIN_COPY.review.missing.headerTitle}
          </span>
          <StatusBadge kind="danger">
            {ADMIN_COPY.review.missing.flaggedCount(events.length)}
          </StatusBadge>
        </div>
      </div>
      <div
        style={{
          padding: '11px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in oklab, var(--warning) 7%, transparent)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <AlertTriangle size={15} color="var(--warning)" />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            color: 'var(--fg)',
            lineHeight: 1.5,
          }}
        >
          {ADMIN_COPY.review.missing.bannerBody}
        </span>
      </div>
      {events.map((event) => (
        <MissingRow
          key={event.id}
          event={event}
          nowIso={nowIso}
          onMarkPostponed={onMarkPostponed}
          onMarkCancelled={onMarkCancelled}
          onDismiss={onDismiss}
          pending={pendingIds.has(event.id)}
        />
      ))}
    </div>
  )
}
