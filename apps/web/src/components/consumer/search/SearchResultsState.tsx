import { MapPin, Mic2, User } from 'lucide-react'
import type { ArtistSearchResult } from '@concert-crawl/types'
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch'
import { EventImage } from '../event-image'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.search

interface SearchResultsStateProps {
  artistResults: ArtistResult[]
  /**
   * #1115 PR-G — artists that have their own page. Rendered as its own section
   * above the event-derived rows; optional so callers that predate the endpoint
   * (and the tests for them) keep working unchanged.
   */
  artistPageResults?: ArtistSearchResult[]
  venueResults: VenueResult[]
  venueFirst?: boolean
  selectedIdx?: number
  onHover?: (idx: number) => void
  onNavigateTo: (
    type: 'artist' | 'artistPage' | 'venue',
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

// #1115 PR-G. Deliberately not folded into ArtistSection: these rows carry a
// photo, an upcoming-show count, and an "Artist page" tag, and they route to
// `/artists/{slug}` rather than a filtered browse — a reader has to be able to
// tell at a glance which of the two an "Artists"-looking row is.
function ArtistPageSection({
  artistPageResults,
  selectedIdx,
  baseIdx,
  showDivider,
  onHover,
  onNavigateTo,
}: {
  artistPageResults: ArtistSearchResult[]
  selectedIdx: number
  baseIdx: number
  showDivider: boolean
  onHover?: (idx: number) => void
  onNavigateTo: (type: 'artistPage', value: { slug: string }) => void
}) {
  if (artistPageResults.length === 0) return null
  return (
    <>
      <SectionHeader
        icon={<Mic2 size={13} strokeWidth={1.5} />}
        label={`${copy.artistPagesSectionPrefix} · ${artistPageResults.length}`}
      />
      {artistPageResults.map((artist, idx) => {
        const itemIdx = baseIdx + idx
        const meta =
          artist.upcomingShowCount > 0
            ? `${artist.upcomingShowCount} ${
                artist.upcomingShowCount === 1
                  ? copy.upcomingShowSingular
                  : copy.upcomingShowPlural
              }`
            : copy.artistPageNoUpcoming
        return (
          <div key={artist.slug}>
            {idx > 0 && <Divider />}
            <button
              onClick={() => onNavigateTo('artistPage', { slug: artist.slug })}
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
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fg-muted)',
                  flexShrink: 0,
                }}
              >
                {/* An artist surface: the portrait or IdentityArt, never an
                    event's artwork. No second source for the same reason.
                    Decorative — the row already renders the name as text, and an
                    empty alt also leaves IdentityArt without a role, so neither
                    branch announces the name twice. */}
                <EventImage
                  src={artist.photoUrl}
                  alt=""
                  artist={artist.name}
                  identityScale="micro"
                  className="h-full w-full"
                />
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
                  {meta}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--accent)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  padding: '2px 6px',
                }}
              >
                {copy.artistPageRowTag}
              </span>
            </button>
          </div>
        )
      })}
      {showDivider && <div style={{ height: 16 }} />}
    </>
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
  artistPageResults = [],
  venueResults,
  venueFirst = false,
  selectedIdx = -1,
  onHover,
  onNavigateTo,
}: SearchResultsStateProps) {
  // Artist pages always sit first and occupy keyboard indices 0..n-1, so the
  // venue/artist bases below shift by that count. `venueFirst` still decides
  // the order of the two event-derived sections beneath them.
  const pageCount = artistPageResults.length
  const venueBaseIdx = pageCount + (venueFirst ? 0 : artistResults.length)
  const artistBaseIdx = pageCount + (venueFirst ? venueResults.length : 0)

  const hoverProp = onHover ? { onHover } : {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
      <ArtistPageSection
        artistPageResults={artistPageResults}
        selectedIdx={selectedIdx}
        baseIdx={0}
        showDivider={artistResults.length > 0 || venueResults.length > 0}
        {...hoverProp}
        onNavigateTo={(type, value) => onNavigateTo(type, value)}
      />
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
