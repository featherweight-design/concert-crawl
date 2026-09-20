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
  onConfirmMove: (event: MissingRowEvent) => void
  pendingIds: ReadonlySet<string>
  // Server-side total used for the header badge so paging doesn't shrink
  // the count to the current page size (#710). Optional for legacy callers
  // that don't paginate; when omitted (or passed explicitly as undefined,
  // which is how MissingTabContent threads through its own optional prop)
  // we fall back to events.length.
  total?: number | undefined
}

export const MissingTable = ({
  events,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  onConfirmMove,
  pendingIds,
  total,
}: MissingTableProps) => {
  const flaggedTotal = total ?? events.length
  const headerBar = (
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
        {flaggedTotal === 0 ? (
          <StatusBadge kind="success" mono>
            {ADMIN_COPY.review.missing.allAccountedFor}
          </StatusBadge>
        ) : (
          <StatusBadge kind="danger" mono>
            {ADMIN_COPY.review.missing.flaggedCount(flaggedTotal)}
          </StatusBadge>
        )}
      </div>
    </div>
  )

  // Gate the "all accounted for" empty state on the server total, not the
  // current page's row count. With pagination, a deep-link to a page past
  // the end (or a momentarily-stale page during clamp-sync) renders
  // `events=[]` while `flaggedTotal > 0` — showing "Nothing's gone missing"
  // alongside a "166 flagged" header badge would be contradictory. When
  // total > 0 we always render the table chrome; the parent's Pagination
  // component clamps the page back to a valid one on the next tick.
  if (flaggedTotal === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {headerBar}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '18px 22px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background:
                'color-mix(in oklab, var(--success) 14%, transparent)',
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
      {headerBar}
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
          {ADMIN_COPY.review.missing.bannerBodyBefore}
          <strong style={{ fontWeight: 700 }}>
            {ADMIN_COPY.review.missing.bannerBodyHighlight}
          </strong>
          {ADMIN_COPY.review.missing.bannerBodyAfter}
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
          onConfirmMove={onConfirmMove}
          pending={pendingIds.has(event.id)}
        />
      ))}
    </div>
  )
}
