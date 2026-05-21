'use client'

import {
  MonoLabel,
  StatusBadge,
  ConfidenceBar,
  AdminButton,
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

interface EventFlagInspectorProps {
  event: EventFlag | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onClose: () => void
}

export const EventFlagInspector = ({
  event,
  onApprove,
  onReject,
  onClose,
}: EventFlagInspectorProps) => {
  if (!event) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          color: 'var(--fg-subtle)',
          fontSize: 13,
          height: '100%',
        }}
      >
        Select an event to inspect
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MonoLabel>event · unverified</MonoLabel>
          <StatusBadge kind="warning">Needs review</StatusBadge>
        </div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '6px 0 0',
            color: 'var(--fg)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {event.title}
        </h3>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto' as const,
          flex: 1,
        }}
      >
        {/* Confidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MonoLabel>Confidence</MonoLabel>
          <ConfidenceBar score={event.confidenceScore ?? 0} />
        </div>

        {/* Extraction strategy */}
        {event.extractionStrategy && (
          <div
            style={{
              padding: '12px 14px',
              background: 'color-mix(in oklab, var(--signal) 7%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--signal) 30%, transparent)',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <MonoLabel>Extraction</MonoLabel>
            </div>
            <span style={{ color: 'var(--fg)' }}>
              {event.extractionStrategy}
            </span>
          </div>
        )}

        {/* Source URL */}
        {event.sourceUrl && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <MonoLabel>Source</MonoLabel>
            </div>
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--signal)',
                textDecoration: 'none',
                wordBreak: 'break-all',
              }}
            >
              {event.sourceUrl}
            </a>
          </div>
        )}

        {/* Event details strip */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            color: 'var(--fg-muted)',
          }}
        >
          <span>
            <MonoLabel>Date</MonoLabel>{' '}
            <span style={{ color: 'var(--fg)' }}>{event.date}</span>
          </span>
          {event.doorsTime && (
            <span>
              <MonoLabel>Doors</MonoLabel>{' '}
              <span style={{ color: 'var(--fg)' }}>{event.doorsTime}</span>
            </span>
          )}
          {event.showTime && (
            <span>
              <MonoLabel>Show</MonoLabel>{' '}
              <span style={{ color: 'var(--fg)' }}>{event.showTime}</span>
            </span>
          )}
          {event.ticketPriceMin && (
            <span>
              <MonoLabel>Price</MonoLabel>{' '}
              <span style={{ color: 'var(--fg)' }}>
                ${event.ticketPriceMin}
                {event.ticketPriceMax ? ` – $${event.ticketPriceMax}` : ''}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Action shelf */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          gap: 8,
        }}
      >
        <AdminButton variant="ghost" size="sm" onClick={onClose}>
          Close
        </AdminButton>
        <AdminButton
          variant="danger"
          size="sm"
          onClick={() => onReject(event.id)}
        >
          Reject
        </AdminButton>
        <AdminButton
          variant="success"
          size="sm"
          onClick={() => onApprove(event.id)}
          style={{ marginLeft: 'auto' }}
        >
          Approve
        </AdminButton>
      </div>
    </div>
  )
}
