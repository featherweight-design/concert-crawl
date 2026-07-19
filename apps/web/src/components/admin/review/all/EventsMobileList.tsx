'use client'

import {
  ConfidenceBar,
  RelTime,
  StatusBadge,
} from '@/components/admin/primitives'
import { LifecycleBadge } from '@/components/admin/events/editor/LifecycleBadge'
import { VerifyMark } from '@/components/admin/events/editor/VerifyMark'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EventRowMenu, type EventRowActions } from './EventRowMenu'
import { type AllEvent } from './types'

// Discriminated union so `selectable` can't be enabled without the toggle
// handler — that combination used to render checkboxes that were no-ops.
type SelectionProps =
  | {
      selectable: true
      selectedIds: ReadonlySet<string>
      onToggleSelected: (id: string) => void
    }
  | {
      selectable?: false
      selectedIds?: undefined
      onToggleSelected?: undefined
    }

export type EventsMobileListProps = {
  events: ReadonlyArray<AllEvent>
  onRowClick: (id: string) => void
  rowActions?: EventRowActions
} & SelectionProps

const formatTime = (time: string | null): string | null => {
  if (!time) return null
  const [hh, mm] = time.split(':')
  const hours = Number.parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${minutes} ${meridiem}`
}

const VENUE_FALLBACK = '—'

const EventCard = ({
  event,
  onClick,
  rowActions,
  selectable,
  isSelected,
  onToggleSelected,
}: {
  event: AllEvent
  onClick: (id: string) => void
  rowActions?: EventRowActions
  selectable?: boolean
  isSelected?: boolean
  onToggleSelected?: (id: string) => void
}) => {
  const timeLabel = formatTime(event.showTime)
  const artist =
    event.artist && event.artist !== event.title ? event.artist : null
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 13,
      }}
    >
      {selectable && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1 }}>
          <input
            type="checkbox"
            aria-label={ADMIN_COPY.review.allEvents.bulkDock.rowAriaLabel}
            checked={isSelected ?? false}
            onChange={() => onToggleSelected?.(event.id)}
            onClick={(evt) => evt.stopPropagation()}
          />
        </div>
      )}
      {rowActions && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <EventRowMenu event={event} actions={rowActions} />
        </div>
      )}
      <button
        type="button"
        onClick={() => onClick(event.id)}
        className="cc-event-card"
        style={{
          cursor: 'pointer',
          display: 'block',
          textAlign: 'left',
          width: '100%',
          // When selectable, drop the checkbox onto its own line above the
          // title by pushing the button content down past the absolutely-
          // positioned checkbox (top:12 + ~16px checkbox = ~28, plus a
          // small gap). Without this the checkbox overlaps the title on
          // mobile (#1081).
          padding: selectable ? '36px 14px 14px' : 14,
          borderRadius: 13,
          background: 'transparent',
          border: 'none',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}
        >
          {event.title}
        </div>
        {artist && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {artist}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 7,
            fontSize: 12.5,
            color: 'var(--fg-muted)',
          }}
        >
          <span>{event.venueName ?? VENUE_FALLBACK}</span>
          <span style={{ color: 'var(--fg-subtle)' }}>·</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: timeLabel ? 'var(--fg-subtle)' : 'var(--warning)',
            }}
          >
            {event.date}
            {timeLabel
              ? ` · ${timeLabel}`
              : ` · ${ADMIN_COPY.review.allEvents.noShowTime}`}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          <LifecycleBadge status={event.status} />
          {event.isSoldOut && (
            <StatusBadge kind="accent" mono>
              {ADMIN_COPY.editor.status.soldOut}
            </StatusBadge>
          )}
          <VerifyMark verified={event.verified} />
          {event.genre?.slice(0, 2).map((tag) => (
            <StatusBadge key={tag} kind="neutral" mono>
              {tag}
            </StatusBadge>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 11,
            paddingTop: 11,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ flex: 1, maxWidth: 130 }}>
            <ConfidenceBar score={event.confidenceScore ?? 0} />
          </div>
          <span style={{ flex: 1 }} />
          <RelTime iso={event.createdAt} />
        </div>
      </button>
    </div>
  )
}

export const EventsMobileList = (props: EventsMobileListProps) => {
  const { events, onRowClick, rowActions } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={onRowClick}
          {...(rowActions ? { rowActions } : {})}
          {...(props.selectable
            ? {
                selectable: true,
                isSelected: props.selectedIds.has(event.id),
                onToggleSelected: props.onToggleSelected,
              }
            : {})}
        />
      ))}
    </div>
  )
}
