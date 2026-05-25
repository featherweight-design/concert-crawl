import { MapPin, User } from 'lucide-react'
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch'
import { copy } from './definitions/copy'

interface SearchResultsStateProps {
  artistResults: ArtistResult[]
  venueResults: VenueResult[]
  venueFirst?: boolean
  selectedIdx?: number
  onHover?: (idx: number) => void
  onNavigateTo: (
    type: 'artist' | 'venue',
    value: string | { slug: string; matchingEventId?: string },
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

function ArtistSection({
  artistResults,
  selectedIdx,
  baseIdx,
  showDivider,
  onHover,
  onNavigateTo,
}: {
  artistResults: ArtistResult[]
  selectedIdx: number
  baseIdx: number
  showDivider: boolean
  onHover?: (idx: number) => void
  onNavigateTo: (type: 'artist', value: string) => void
}) {
  if (artistResults.length === 0) return null
  return (
    <>
      <SectionHeader
        icon={<User size={13} strokeWidth={1.5} />}
        label={`${copy.artistsSectionPrefix} · ${artistResults.length}`}
      />
      {artistResults.map((artist, idx) => {
        const itemIdx = baseIdx + idx
        return (
          <div key={artist.name}>
            {idx > 0 && <Divider />}
            <button
              onClick={() => onNavigateTo('artist', artist.name)}
              onMouseEnter={() => onHover?.(itemIdx)}
              data-selected={selectedIdx === itemIdx ? 'true' : undefined}
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
                  selectedIdx === itemIdx ? 'var(--surface-2)' : 'transparent',
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
        )
      })}
      {showDivider && <div style={{ height: 16 }} />}
    </>
  )
}

function VenueSection({
  venueResults,
  selectedIdx,
  baseIdx,
  showDivider,
  onHover,
  onNavigateTo,
}: {
  venueResults: VenueResult[]
  selectedIdx: number
  baseIdx: number
  showDivider: boolean
  onHover?: (idx: number) => void
  onNavigateTo: (
    type: 'venue',
    value: { slug: string; matchingEventId?: string },
  ) => void
}) {
  if (venueResults.length === 0) return null
  return (
    <>
      <SectionHeader
        icon={<MapPin size={13} strokeWidth={1.5} />}
        label={`${copy.venuesSectionPrefix} · ${venueResults.length}`}
      />
      {venueResults.map((venue, idx) => {
        const itemIdx = baseIdx + idx
        return (
          <div key={venue.slug}>
            {idx > 0 && <Divider />}
            <button
              onClick={() =>
                onNavigateTo('venue', {
                  slug: venue.slug,
                  matchingEventId: venue.matchingEventId,
                })
              }
              onMouseEnter={() => onHover?.(itemIdx)}
              data-selected={selectedIdx === itemIdx ? 'true' : undefined}
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
                  selectedIdx === itemIdx ? 'var(--surface-2)' : 'transparent',
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
                  {venue.showCount}{' '}
                  {venue.showCount !== 1
                    ? copy.upcomingShowPlural
                    : copy.upcomingShowSingular}
                </div>
              </div>
            </button>
          </div>
        )
      })}
      {showDivider && <div style={{ height: 16 }} />}
    </>
  )
}

export function SearchResultsState({
  artistResults,
  venueResults,
  venueFirst = false,
  selectedIdx = -1,
  onHover,
  onNavigateTo,
}: SearchResultsStateProps) {
  const venueBaseIdx = venueFirst ? 0 : artistResults.length
  const artistBaseIdx = venueFirst ? venueResults.length : 0

  const hoverProp = onHover ? { onHover } : {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
      {venueFirst ? (
        <>
          <VenueSection
            venueResults={venueResults}
            selectedIdx={selectedIdx}
            baseIdx={venueBaseIdx}
            showDivider={artistResults.length > 0}
            {...hoverProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
          <ArtistSection
            artistResults={artistResults}
            selectedIdx={selectedIdx}
            baseIdx={artistBaseIdx}
            showDivider={false}
            {...hoverProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
        </>
      ) : (
        <>
          <ArtistSection
            artistResults={artistResults}
            selectedIdx={selectedIdx}
            baseIdx={artistBaseIdx}
            showDivider={venueResults.length > 0}
            {...hoverProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
          <VenueSection
            venueResults={venueResults}
            selectedIdx={selectedIdx}
            baseIdx={venueBaseIdx}
            showDivider={false}
            {...hoverProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
        </>
      )}
    </div>
  )
}
