import { MapPin, User } from 'lucide-react'
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch'

interface SearchResultsStateProps {
  artistResults: ArtistResult[]
  venueResults: VenueResult[]
  selectedIdx?: number
  onHover?: (idx: number) => void
  onNavigateTo: (
    type: 'artist' | 'venue',
    value: string | { slug: string },
  ) => void
}

function SectionHeader({
  icon,
  label,
}: {
  icon?: React.ReactNode
  label: string
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
      {icon && (
        <span style={{ color: 'var(--fg-muted)', display: 'inline-flex' }}>
          {icon}
        </span>
      )}
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

function Divider() {
  return (
    <div style={{ height: 1, background: 'var(--border)', marginLeft: 68 }} />
  )
}

export function SearchResultsState({
  artistResults,
  venueResults,
  selectedIdx = -1,
  onHover,
  onNavigateTo,
}: SearchResultsStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
      {artistResults.length > 0 && (
        <>
          <SectionHeader
            icon={<User size={13} strokeWidth={1.5} />}
            label={`Artists · ${artistResults.length}`}
          />
          {artistResults.map((artist, idx) => (
            <div key={artist.name}>
              {idx > 0 && <Divider />}
              <button
                onClick={() => onNavigateTo('artist', artist.name)}
                onMouseEnter={() => onHover?.(idx)}
                data-selected={selectedIdx === idx ? 'true' : undefined}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  background:
                    selectedIdx === idx ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-muted)',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
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
                    {artist.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--fg-muted)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {artist.venueShort}
                  </div>
                </div>
              </button>
            </div>
          ))}
          {venueResults.length > 0 && <div style={{ height: 16 }} />}
        </>
      )}

      {venueResults.length > 0 && (
        <>
          <SectionHeader
            icon={<MapPin size={13} strokeWidth={1.5} />}
            label={`Venues · ${venueResults.length}`}
          />
          {venueResults.map((venue, idx) => {
            const venueIdx = artistResults.length + idx
            return (
              <div key={venue.slug}>
                {idx > 0 && <Divider />}
                <button
                  onClick={() => onNavigateTo('venue', { slug: venue.slug })}
                  onMouseEnter={() => onHover?.(venueIdx)}
                  data-selected={selectedIdx === venueIdx ? 'true' : undefined}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    background:
                      selectedIdx === venueIdx
                        ? 'var(--surface-2)'
                        : 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--fg-muted)',
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={18} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
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
                      {venue.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--fg-muted)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {venue.showCount} upcoming show
                      {venue.showCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
