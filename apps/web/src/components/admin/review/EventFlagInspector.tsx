'use client'

import {
  MonoLabel,
  StatusBadge,
  ConfidenceBar,
  AdminButton,
} from '@/components/admin/primitives'
import { SquarePen } from 'lucide-react'

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
  // Optional enriched fields from LLM extraction runs
  llmReasoning?: string | null
  rawSource?: string | null
  runId?: string | null
  llmCost?: number | null
  tokenCount?: number | null
}

interface EventFlagInspectorProps {
  event: EventFlag | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onClose?: () => void
  onEdit?: (id: string) => void
}

function formatDateTime(date: string, showTime: string | null): string {
  try {
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
    const datePart = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    if (!showTime) return datePart
    const [hh, mm] = showTime.split(':')
    const hours = parseInt(hh ?? '0', 10)
    const mins = mm ?? '00'
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours % 12 || 12
    return `${datePart} ${displayHour}:${mins} ${ampm}`
  } catch {
    return date
  }
}

export const EventFlagInspector = ({
  event,
  onApprove,
  onReject,
  onEdit,
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
          borderLeft: '1px solid var(--border)',
        }}
      >
        Select an event to inspect
      </div>
    )
  }

  const shortId = `EVT-${event.id.slice(-4).toUpperCase()}`
  const flags = event.genre?.filter(Boolean) ?? []
  const dateTime = formatDateTime(event.date, event.showTime)
  const venueLine = [event.venueName ?? event.venueId, dateTime]
    .filter(Boolean)
    .join(' · ')

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--fg-subtle)',
            }}
          >
            {shortId}
          </span>
          {flags.length > 0 && (
            <>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                }}
              >
                ·
              </span>
              <StatusBadge kind="warning" variant="outline">
                {flags.join(' · ')}
              </StatusBadge>
            </>
          )}
          {flags.length === 0 && (
            <StatusBadge kind="warning">Needs review</StatusBadge>
          )}
        </div>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            margin: '0 0 4px',
            color: 'var(--fg)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {event.title}
        </h3>
        {venueLine && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            {venueLine}
          </span>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* Confidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MonoLabel>Confidence</MonoLabel>
          <ConfidenceBar score={event.confidenceScore ?? 0} />
        </div>

        {/* LLM Reasoning */}
        {event.llmReasoning && (
          <div>
            <MonoLabel color="var(--danger)">LLM Reasoning</MonoLabel>
            <div
              style={{
                padding: '14px 16px',
                marginTop: 8,
                background:
                  'color-mix(in oklab, var(--danger) 6%, var(--bg-elevated))',
                border:
                  '1px solid color-mix(in oklab, var(--danger) 28%, transparent)',
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--fg)',
              }}
            >
              {event.llmReasoning}
            </div>
          </div>
        )}

        {/* Extraction strategy (fallback when no reasoning) */}
        {!event.llmReasoning && event.extractionStrategy && (
          <div>
            <MonoLabel>Extraction</MonoLabel>
            <div
              style={{
                padding: '12px 14px',
                marginTop: 8,
                background:
                  'color-mix(in oklab, var(--accent) 7%, transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                lineHeight: 1.55,
                color: 'var(--fg)',
              }}
            >
              {event.extractionStrategy}
            </div>
          </div>
        )}

        {/* Raw source HTML */}
        {event.rawSource && (
          <div>
            <MonoLabel>Raw source</MonoLabel>
            <pre
              style={{
                margin: '8px 0 0',
                padding: '14px 16px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                color: 'var(--fg-muted)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {event.rawSource}
            </pre>
          </div>
        )}

        {/* Source URL (when no raw source) */}
        {!event.rawSource && event.sourceUrl && (
          <div>
            <MonoLabel>Source</MonoLabel>
            <div
              style={{
                padding: '12px 14px',
                marginTop: 8,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}
            >
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--fg-muted)',
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
              >
                {event.sourceUrl}
              </a>
            </div>
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

        {/* Run / cost strip */}
        {event.runId && (
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              display: 'flex',
              gap: 12,
              color: 'var(--fg-muted)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--fg)' }}>run {event.runId}</span>
            {event.llmCost != null && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  ${event.llmCost.toFixed(4)}
                </span>
              </>
            )}
            {event.tokenCount != null && (
              <>
                <span>·</span>
                <span>{event.tokenCount.toLocaleString()} tok</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action shelf */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() => onReject(event.id)}
        >
          Reject
        </AdminButton>
        {onEdit && (
          <AdminButton
            variant="outline"
            size="sm"
            icon={SquarePen}
            onClick={() => onEdit(event.id)}
          >
            Edit & approve
          </AdminButton>
        )}
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
