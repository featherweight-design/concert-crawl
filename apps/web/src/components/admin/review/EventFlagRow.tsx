'use client'

import {
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

interface EventFlagRowProps {
  event: EventFlag
  isActive: boolean
  isSelected: boolean
  onSelect: (id: string, checked: boolean) => void
  onActivate: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export const EventFlagRow = ({
  event,
  isActive,
  isSelected,
  onSelect,
  onActivate,
  onApprove,
  onReject,
}: EventFlagRowProps) => {
  const isLlm = event.extractionStrategy === 'llm'

  const rowBackground = isActive
    ? 'var(--surface-2)'
    : isSelected
      ? 'color-mix(in oklab, var(--signal) 6%, transparent)'
      : undefined

  const borderLeft = isActive
    ? '2px solid var(--signal)'
    : '2px solid transparent'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onActivate(event.id)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault()
          onActivate(event.id)
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: 14,
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        borderLeft,
        cursor: 'pointer',
        background: rowBackground,
        alignItems: 'center',
      }}
      onMouseEnter={(ev) => {
        if (!isActive && !isSelected) {
          ev.currentTarget.style.background = 'var(--overlay-hover)'
        }
      }}
      onMouseLeave={(ev) => {
        if (!isActive && !isSelected) {
          ev.currentTarget.style.background = ''
        }
      }}
    >
      {/* Col 1: checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(evt) => onSelect(event.id, evt.target.checked)}
        onClick={(evt) => evt.stopPropagation()}
        style={{
          accentColor: 'var(--signal)',
          width: 15,
          height: 15,
          marginTop: 2,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />

      {/* Col 2: main content */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            lineHeight: 1.4,
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--fg)',
            marginBottom: 4,
          }}
        >
          {event.title}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: 'var(--fg-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.venueName ?? event.venueId} · {event.date}
        </div>
        {event.extractionStrategy && (
          <div
            style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}
          >
            <StatusBadge kind={isLlm ? 'signal' : 'neutral'} variant="soft">
              {event.extractionStrategy}
            </StatusBadge>
          </div>
        )}
      </div>

      {/* Col 3: confidence */}
      <div style={{ minWidth: 96 }}>
        <ConfidenceBar score={event.confidenceScore ?? 0} />
      </div>

      {/* Col 4: actions */}
      <div
        style={{ display: 'flex', gap: 6 }}
        onClick={(evt) => evt.stopPropagation()}
      >
        <AdminButton
          variant="success"
          size="sm"
          onClick={() => onApprove(event.id)}
        >
          Approve
        </AdminButton>
        <AdminButton
          variant="danger"
          size="sm"
          onClick={() => onReject(event.id)}
        >
          Reject
        </AdminButton>
      </div>
    </div>
  )
}
