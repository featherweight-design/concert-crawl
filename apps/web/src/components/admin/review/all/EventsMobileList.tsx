'use client'

import {
  ConfidenceBar,
  RelTime,
  StatusBadge,
} from '@/components/admin/primitives'
import { LifecycleBadge } from '@/components/admin/events/editor/LifecycleBadge'
import { VerifyMark } from '@/components/admin/events/editor/VerifyMark'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { type AllEvent } from './types'

export interface EventsMobileListProps {
  events: ReadonlyArray<AllEvent>
  onRowClick: (id: string) => void
}

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
}: {
  event: AllEvent
  onClick: (id: string) => void
}) => {
  const timeLabel = formatTime(event.showTime)
  const artist =
    event.artist && event.artist !== event.title ? event.artist : null
  return (
    <button
      type="button"
      onClick={() => onClick(event.id)}
      className="cc-event-card"
      style={{
        cursor: 'pointer',
        display: 'block',
        textAlign: 'left',
        width: '100%',
        padding: 14,
        borderRadius: 13,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
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
  )
}

export const EventsMobileList = ({
  events,
  onRowClick,
}: EventsMobileListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {events.map((event) => (
      <EventCard key={event.id} event={event} onClick={onRowClick} />
    ))}
  </div>
)
