'use client'

import { useState } from 'react'
import { MapPin, Mic2, User } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import type { ArtistSearchResult, PickerEntry } from '@concert-crawl/types'
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { ArtistResultRow } from './ArtistResultRow'
import {
  SEARCH_DESKTOP_QUERY,
  SEARCH_FOLLOW_ICON_ONLY_QUERY,
  SEARCH_RAIL_WIDTH,
} from './definitions/constants'

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
  /**
   * Render the desktop explainer rail beside the results (native following,
   * PR 5). Opt-in because the same component draws the command palette's
   * dropdown, which is 560px of overlay with no room for a second column.
   */
  withExplainerRail?: boolean
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

// #1115 PR-G, extended by native following PR 5. Deliberately not folded into
// ArtistSection: these rows carry a photo, an upcoming-show count, an "Artist
// page" tag and a Follow button, and they route to `/artists/{slug}` rather
// than a filtered browse — a reader has to be able to tell at a glance which of
// the two an "Artists"-looking row is.
//
// The section owns the gate and the sheet; the rows own their own follow state.
// One sheet for the whole list, one entitlement read, and no row can open a
// picker its neighbours disagree with.
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
  const { isSignedIn } = useAuth()
  const { surface } = useEntitlement('following')
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const iconOnly = useMediaQuery(SEARCH_FOLLOW_ICON_ONLY_QUERY)
  const isDesktop = useMediaQuery(SEARCH_DESKTOP_QUERY)

  // A logged-out tap gets the sign-up pitch; a signed-in locked tap gets the
  // paywall. `surface` is what the entitlements matrix routes on, so the entry
  // is read from it rather than from `isSignedIn` alone.
  const pickerEntry: PickerEntry =
    surface === 'tier-picker-on-tap' ? 'logged-out-follow' : 'paywall'

  if (artistPageResults.length === 0) return null
  return (
    <>
      <SectionHeader
        icon={<Mic2 size={13} strokeWidth={1.5} />}
        label={`${copy.artistPagesSectionPrefix} · ${artistPageResults.length}`}
      />
      {artistPageResults.map((artist, idx) => {
        const itemIdx = baseIdx + idx
        const hoverProps = onHover ? { onHover: () => onHover(itemIdx) } : {}
        return (
          <div key={artist.slug}>
            {idx > 0 && <Divider />}
            <ArtistResultRow
              artist={artist}
              selected={selectedIdx === itemIdx}
              {...hoverProps}
              onNavigate={() =>
                onNavigateTo('artistPage', { slug: artist.slug })
              }
              isSignedIn={isSignedIn}
              surface={surface}
              onLockedTap={() => setPickerOpen(true)}
              onEntitlementRequired={() => setPickerOpen(true)}
              size={isDesktop ? 'md' : 'sm'}
              iconOnly={iconOnly}
            />
          </div>
        )
      })}
      {showDivider && <div style={{ height: 16 }} />}
      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        // Unknowable here and only ever widens the flow, so `true` is the
        // fail-safe: it asks for the extra confirmation rather than skipping it.
        scaRegion
        entry={pickerEntry}
      />
    </>
  )
}

/**
 * The desktop-only second column. At 1080px the case for following would
 * otherwise be one lonely sentence under a short list, and the explanation is
 * what makes a viewer with no follows act at all.
 */
function ExplainerRail() {
  return (
    <aside
      style={{
        borderRadius: 12,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignSelf: 'start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
        }}
      >
        {FOLLOWING_COPY.searchRailEyebrow}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          textWrap: 'pretty',
        }}
      >
        {FOLLOWING_COPY.searchRailBody}
      </p>
      <div style={{ height: 1, background: 'var(--border)' }} />
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          textWrap: 'pretty',
        }}
      >
        {FOLLOWING_COPY.searchRailNoDates}
      </p>
    </aside>
  )
}

/**
 * The same case, below the list, where there is no second column to put it in.
 * The rail shipped desktop-only on the reasoning that "mobile carries it in the
 * rows themselves" — mobile carried nothing, so the majority viewport got the
 * artist rows with no explanation of what following them does.
 *
 * It is the body only. The rail's eyebrow labels a column that does not exist
 * here, and its no-dates paragraph argues against a muted row line the mobile
 * list already shows.
 */
function ExplainerFootnote() {
  return (
    <p
      style={{
        margin: '4px 16px 12px',
        fontSize: 13,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        textWrap: 'pretty',
      }}
    >
      {FOLLOWING_COPY.searchRailBody}
    </p>
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
  withExplainerRail = false,
  selectedIdx = -1,
  onHover,
  onNavigateTo,
}: SearchResultsStateProps) {
  const isDesktop = useMediaQuery(SEARCH_DESKTOP_QUERY)

  // The explanation is owed whenever the list has artist rows to explain. With
  // none there is nothing to say, and an empty second column would just narrow
  // the shows. Only the SHAPE forks on viewport: a rail beside, a footnote below.
  const explain = withExplainerRail && artistPageResults.length > 0
  const showRail = explain && isDesktop

  // Artist pages always sit first and occupy keyboard indices 0..n-1, so the
  // venue/artist bases below shift by that count. `venueFirst` still decides
  // the order of the two event-derived sections beneath them.
  const pageCount = artistPageResults.length
  const venueBaseIdx = pageCount + (venueFirst ? 0 : artistResults.length)
  const artistBaseIdx = pageCount + (venueFirst ? venueResults.length : 0)

  const hoverProp = onHover ? { onHover } : {}

  const results = (
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
      {explain && !isDesktop && <ExplainerFootnote />}
    </div>
  )

  if (!showRail) return results

  return (
    <div
      style={{
        display: 'grid',
        // The handoff's locked desktop split. `minmax(0, 1fr)` rather than a
        // bare `1fr` so a long artist name ellipsises instead of forcing the
        // rail off the right edge.
        gridTemplateColumns: `minmax(0, 1fr) ${SEARCH_RAIL_WIDTH}px`,
        gap: 30,
        alignItems: 'start',
      }}
    >
      {results}
      <ExplainerRail />
    </div>
  )
}
