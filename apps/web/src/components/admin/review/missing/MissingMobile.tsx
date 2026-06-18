'use client'

import { AlertTriangle, Check } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { StatusBadge } from '@/components/admin/primitives'
import {
  computeMissedSweeps,
  formatEventDate,
  formatLastSeen,
} from '@/lib/admin/missing'
import { MissingChips } from './MissingChips'
import { MissingRowMenu } from './MissingRowMenu'
import { type MissingRowEvent } from './MissingRow'

export interface MissingMobileProps {
  events: MissingRowEvent[]
  nowIso: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  pendingIds: ReadonlySet<string>
}

export const MissingMobile = ({
  events,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  pendingIds,
}: MissingMobileProps) => {
  if (events.length === 0) {
    return (
      <div
        style={{
          borderRadius: 13,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
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
          <StatusBadge kind="success" mono>
            {ADMIN_COPY.review.missing.allAccountedFor}
          </StatusBadge>
        </div>
        <div
          style={{
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background:
                'color-mix(in oklab, var(--success) 14%, transparent)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={20} />
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
                marginTop: 4,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          padding: '11px 13px',
          borderRadius: 11,
          background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
          border:
            '1px solid color-mix(in oklab, var(--warning) 28%, transparent)',
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={14} color="var(--warning)" />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'var(--fg)',
            lineHeight: 1.5,
          }}
        >
          {ADMIN_COPY.review.missing.mobileBannerBodyBefore}
          <strong style={{ fontWeight: 700 }}>
            {ADMIN_COPY.review.missing.bannerBodyHighlight}
          </strong>
          {ADMIN_COPY.review.missing.mobileBannerBodyAfter}
        </span>
      </div>
      {events.map((event) => {
        const missed = computeMissedSweeps(event.firstMissingAt, nowIso)
        const pending = pendingIds.has(event.id)
        return (
          <div
            key={event.id}
            style={{
              padding: 14,
              borderRadius: 13,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              opacity: pending ? 0.55 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                }}
              >
                {event.title}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {ADMIN_COPY.review.missing.lastSeenLabel}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--warning)',
                    marginTop: 2,
                  }}
                >
                  {formatLastSeen(event.lastSeenAt)}
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginTop: 3,
              }}
            >
              {event.venueName ?? '—'} · {formatEventDate(event.date)}
            </div>
            <div style={{ margin: '12px 0' }}>
              <MissingChips missedCount={missed} />
            </div>
            <MissingRowMenu
              eventId={event.id}
              onMarkPostponed={onMarkPostponed}
              onMarkCancelled={onMarkCancelled}
              onDismiss={onDismiss}
              stacked
              disabled={pending}
            />
          </div>
        )
      })}
    </div>
  )
}
