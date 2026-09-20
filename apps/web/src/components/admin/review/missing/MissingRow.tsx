'use client'

import {
  type MissingClassification,
  type MovedReason,
} from '@concert-crawl/types'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  computeMissedSweeps,
  formatEventDate,
  formatLastSeen,
} from '@/lib/admin/missing'
import { MissingChips } from './MissingChips'
import {
  MissingEventLink,
  MissingVenueLink,
  VenueCheckLink,
} from './MissingLinks'
import { MissingRowMenu } from './MissingRowMenu'

export interface MissingRowEvent {
  id: string
  title: string
  venueName: string | null
  venueId: string | null
  date: string
  showTime: string | null
  lastSeenAt: string | null
  firstMissingAt: string
  eventUrl: string | null
  sourceUrl: string | null
  classification: MissingClassification
  clusterCount: number
  /** Suggested relocation target, or null when the matcher found none. */
  movedCandidate: {
    id: string
    reason: MovedReason
    title: string
    date: string
    venueName: string | null
  } | null
}

export interface MissingRowProps {
  event: MissingRowEvent
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  onConfirmMove: (event: MissingRowEvent) => void
  pending?: boolean
}

const formatTime = (showTime: string | null): string => {
  if (!showTime) return ''
  const [hh, mm] = showTime.split(':')
  const hours = parseInt(hh ?? '0', 10)
  const minutes = mm ?? '00'
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return ` ${display}:${minutes} ${meridiem}`
}

export const MissingRow = ({
  event,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  onConfirmMove,
  pending = false,
}: MissingRowProps) => {
  const missed = computeMissedSweeps(event.firstMissingAt, nowIso)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto auto',
        gap: 18,
        alignItems: 'center',
        padding: '16px 18px',
        borderBottom: '1px solid var(--border)',
        opacity: pending ? 0.55 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <MissingEventLink
            eventId={event.id}
            title={event.title}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-subtle)',
            }}
          >
            ·
          </span>
          <MissingVenueLink
            venueId={event.venueId}
            venueName={event.venueName}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-subtle)',
            }}
          >
            {formatEventDate(event.date)}
            {formatTime(event.showTime)}
          </span>
          <VenueCheckLink
            title={event.title}
            eventUrl={event.eventUrl}
            sourceUrl={event.sourceUrl}
          />
        </div>
        <MissingChips
          missedCount={missed}
          classification={event.classification}
          clusterCount={event.clusterCount}
          venueName={event.venueName}
        />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {ADMIN_COPY.review.missing.lastSeenLabel}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--warning)',
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatLastSeen(event.lastSeenAt)}
        </div>
      </div>
      <MissingRowMenu
        eventId={event.id}
        onMarkPostponed={onMarkPostponed}
        onMarkCancelled={onMarkCancelled}
        onDismiss={onDismiss}
        {...(event.movedCandidate
          ? { onConfirmMove: () => onConfirmMove(event) }
          : {})}
        disabled={pending}
      />
    </div>
  )
}
