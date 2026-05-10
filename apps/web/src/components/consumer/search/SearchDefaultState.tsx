import { History, Flame } from 'lucide-react'
import type { PopularEvent } from '../../../lib/search/useSearch'

interface SearchDefaultStateProps {
  recentSearches: string[]
  popularEvents: PopularEvent[]
  onPickQuery: (query: string) => void
  onPickEvent: (type: 'artist', value: string) => void
}

function SectionHeader({
  icon,
  label,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 16px 8px',
      }}
    >
      <span
        style={{
          color: accent ? 'var(--accent)' : 'var(--fg-muted)',
          display: 'inline-flex',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function SearchDefaultState({
  recentSearches,
  popularEvents,
  onPickQuery,
  onPickEvent,
}: SearchDefaultStateProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', paddingBottom: 40 }}
    >
      {recentSearches.length > 0 && (
        <>
          <SectionHeader
            icon={<History size={13} strokeWidth={1.5} />}
            label="Recent"
          />
          {recentSearches.map((query) => (
            <button
              key={query}
              onClick={() => onPickQuery(query)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}
            >
              <span
                style={{
                  color: 'var(--fg-subtle)',
                  display: 'inline-flex',
                  flexShrink: 0,
                }}
              >
                <History size={16} strokeWidth={1.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  fontSize: 14,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                }}
              >
                {query}
              </span>
            </button>
          ))}
          <div style={{ height: 8 }} />
        </>
      )}

      {popularEvents.length > 0 && (
        <>
          <SectionHeader
            icon={<Flame size={13} strokeWidth={1.5} />}
            label="Popular this week"
            accent
          />
          {popularEvents.map((event, idx) => (
            <button
              key={event.id}
              onClick={() => onPickEvent('artist', event.artist)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                width: '100%',
                boxSizing: 'border-box' as const,
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--fg)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.artist}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-muted)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {event.venue.name}
                </span>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: event.ticketPriceMin
                    ? 'var(--signal)'
                    : 'var(--fg-subtle)',
                }}
              >
                {event.ticketPriceMin ? `$${event.ticketPriceMin}` : 'TBA'}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
