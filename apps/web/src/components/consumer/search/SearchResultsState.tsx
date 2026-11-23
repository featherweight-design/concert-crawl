'use client';

import { ChevronRight } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import type { ArtistSearchAllResult } from '@concert-crawl/types';
import type { ArtistResult, VenueResult } from '../../../lib/search/useSearch';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { ArtistResultRow } from './ArtistResultRow';
import { isSharedName, sharedNames } from './artist-line';
import { GenreChips } from '../GenreChips';
import { VenueTile } from '../venue-glyph';
import {
  Highlight,
  RESULT_ART_SIZE,
  RESULT_META_STYLE,
  RESULT_NAME_STYLE,
  ResultPrice,
  RingArt,
  SectionLabel,
  formatDayLabel,
  VenueDateLine,
  resultRowProps,
  resultRowStyle,
  useListboxRows,
  ringColorFor,
} from './ResultParts';
import {
  SEARCH_DESKTOP_QUERY,
  SEARCH_FOLLOW_ICON_ONLY_QUERY,
  SEARCH_RAIL_WIDTH,
} from './definitions/constants';

const copy = CONSUMER_COPY.search;

interface SearchResultsStateProps {
  artistResults: ArtistResult[];
  /**
   * The artist list (addendum 12): ours and MusicBrainz's, ranked, kinds 1 to
   * 3. It leads the results and owns the first keyboard indices.
   */
  artistList?: ArtistSearchAllResult[];
  venueResults: VenueResult[];
  venueFirst?: boolean;
  /**
   * Render the desktop explainer rail beside the results (native following,
   * PR 5). Opt-in because the same component draws the command palette's
   * dropdown, which is 560px of overlay with no room for a second column.
   */
  withExplainerRail?: boolean;
  selectedIdx?: number;
  onHover?: (idx: number) => void;
  /** The typed query, lit in each row's name (B19). */
  query?: string;
  onNavigateTo: (
    type: 'artist' | 'artistPage' | 'venue',
    value: string | { slug: string; matchingEventId?: string },
  ) => void;
  /** The palette drills into a MusicBrainz-only act rather than opening a sheet. */
  onOpenPreview?: (artist: ArtistSearchAllResult) => void;
  /** Palette only: a MusicBrainz-only row's follow changed (slug, or null). */
  onFollowed?: (mbid: string, slug: string | null) => void;
}

// The one artist list (addendum 12). Kinds 1 and 2 open `/artists/{slug}`; a
// MusicBrainz-only act (kind 3) has no page, so its row opens the preview (the
// palette drills in through `onOpenPreview` instead).
//
// The section owns the gate and the sheet; the rows own their own follow state.
function ArtistListSection({
  artistList,
  selectedIdx,
  baseIdx,
  query,
  onHover,
  onNavigateTo,
  onOpenPreview,
  onFollowed,
}: {
  artistList: ArtistSearchAllResult[];
  selectedIdx: number;
  baseIdx: number;
  query?: string | undefined;
  onHover?: (idx: number) => void;
  onNavigateTo: (type: 'artistPage', value: { slug: string }) => void;
  onOpenPreview?: ((artist: ArtistSearchAllResult) => void) | undefined;
  onFollowed?: ((mbid: string, slug: string | null) => void) | undefined;
}) {
  const listbox = useListboxRows();
  const { isSignedIn } = useAuth();
  const iconOnly = useMediaQuery(SEARCH_FOLLOW_ICON_ONLY_QUERY);
  const isDesktop = useMediaQuery(SEARCH_DESKTOP_QUERY);

  if (artistList.length === 0) return null;
  const shared = sharedNames(artistList);
  return (
    <>
      <SectionLabel
        label={`${copy.artistsSectionPrefix} · ${artistList.length}`}
      />
      {artistList.map((artist, idx) => {
        const itemIdx = baseIdx + idx;
        const hoverProps = onHover ? { onHover: () => onHover(itemIdx) } : {};
        const { slug } = artist;
        return (
          <div key={artist.slug ?? artist.mbid ?? artist.name}>
            <ArtistResultRow
              {...(query === undefined ? {} : { query })}
              artist={artist}
              sharedName={isSharedName(shared, artist)}
              selected={selectedIdx === itemIdx}
              itemIdx={itemIdx}
              listbox={listbox}
              {...hoverProps}
              {...(slug === null
                ? onOpenPreview
                  ? { onNavigate: () => onOpenPreview(artist) }
                  : {}
                : { onNavigate: () => onNavigateTo('artistPage', { slug }) })}
              {...(onFollowed ? { onFollowed } : {})}
              isSignedIn={isSignedIn}
              size={isDesktop ? 'rowWide' : 'row'}
              iconOnly={iconOnly}
            />
          </div>
        );
      })}
    </>
  );
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
  );
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
  );
}

function ArtistSection({
  artistResults,
  selectedIdx,
  baseIdx,
  query,
  onHover,
  onNavigateTo,
}: {
  artistResults: ArtistResult[];
  selectedIdx: number;
  baseIdx: number;
  query?: string | undefined;
  onHover?: (idx: number) => void;
  onNavigateTo: (type: 'artist', value: string) => void;
}) {
  const listbox = useListboxRows();
  if (artistResults.length === 0) return null;
  return (
    <>
      <SectionLabel
        label={`${copy.showsSectionPrefix} · ${artistResults.length}`}
      />
      {artistResults.map((artist, idx) => {
        const itemIdx = baseIdx + idx;
        const selected = selectedIdx === itemIdx;
        const ring = ringColorFor(artist.genres);
        return (
          <button
            key={artist.name}
            type="button"
            onClick={() => onNavigateTo('artist', artist.name)}
            onMouseEnter={() => onHover?.(itemIdx)}
            {...resultRowProps(listbox, itemIdx, selected)}
            style={resultRowStyle(selected, ring)}
          >
            <RingArt
              name={artist.name}
              imageUrl={artist.imageUrl}
              photoUrl={artist.artistPhotoUrl}
              ring={ring}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={RESULT_NAME_STYLE}>
                <Highlight text={artist.name} {...(query ? { query } : {})} />
              </span>
              <VenueDateLine
                venue={artist.venueShort}
                date={formatDayLabel(artist.nextDate)}
              />
              <GenreChips genres={artist.genres ?? null} maxChips={1} />
            </span>
            <ResultPrice value={artist.ticketPriceMin} />
          </button>
        );
      })}
    </>
  );
}

function VenueSection({
  venueResults,
  selectedIdx,
  baseIdx,
  query,
  onHover,
  onNavigateTo,
}: {
  venueResults: VenueResult[];
  selectedIdx: number;
  baseIdx: number;
  query?: string | undefined;
  onHover?: (idx: number) => void;
  onNavigateTo: (
    type: 'venue',
    value: { slug: string; matchingEventId?: string },
  ) => void;
}) {
  const listbox = useListboxRows();
  if (venueResults.length === 0) return null;
  return (
    <>
      <SectionLabel
        label={`${copy.venuesSectionPrefix} · ${venueResults.length}`}
      />
      {venueResults.map((venue, idx) => {
        const itemIdx = baseIdx + idx;
        const selected = selectedIdx === itemIdx;
        return (
          <button
            key={venue.slug}
            type="button"
            onClick={() =>
              onNavigateTo('venue', {
                slug: venue.slug,
                matchingEventId: venue.matchingEventId,
              })
            }
            onMouseEnter={() => onHover?.(itemIdx)}
            {...resultRowProps(listbox, itemIdx, selected)}
            // A venue has no genre: its edge is the neutral ring, and its
            // identity is the glyph tile (README rule 5).
            style={resultRowStyle(selected, ringColorFor(null))}
          >
            <VenueTile
              slug={venue.slug}
              name={venue.name}
              size={RESULT_ART_SIZE}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={RESULT_NAME_STYLE}>
                <Highlight text={venue.name} {...(query ? { query } : {})} />
              </span>
              <span style={RESULT_META_STYLE}>
                {venue.showCount}{' '}
                {venue.showCount !== 1
                  ? copy.upcomingShowPlural
                  : copy.upcomingShowSingular}
              </span>
            </span>
            <ChevronRight
              size={16}
              strokeWidth={1.75}
              aria-hidden
              style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}
            />
          </button>
        );
      })}
    </>
  );
}

export function SearchResultsState({
  artistResults,
  artistList = [],
  venueResults,
  venueFirst = false,
  withExplainerRail = false,
  selectedIdx = -1,
  onHover,
  query,
  onNavigateTo,
  onOpenPreview,
  onFollowed,
}: SearchResultsStateProps) {
  const isDesktop = useMediaQuery(SEARCH_DESKTOP_QUERY);

  // The explanation is owed whenever the list has artist rows to explain. With
  // none there is nothing to say, and an empty second column would just narrow
  // the shows. Only the SHAPE forks on viewport: a rail beside, a footnote below.
  const explain = withExplainerRail && artistList.length > 0;
  const showRail = explain && isDesktop;

  // B+ draws Artists, Shows, then Venues. The artist list always leads and
  // owns the first keyboard indices; `venueFirst` swaps Shows and Venues.
  const listLength = artistList.length;
  const showBaseIdx = venueFirst
    ? listLength + venueResults.length
    : listLength;
  const venueBaseIdx = venueFirst
    ? listLength
    : listLength + artistResults.length;

  const hoverProp = onHover ? { onHover } : {};
  const queryProp = query === undefined ? {} : { query };

  const results = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0 8px 10px',
      }}
    >
      <ArtistListSection
        artistList={artistList}
        selectedIdx={selectedIdx}
        baseIdx={0}
        {...hoverProp}
        {...queryProp}
        onNavigateTo={(type, value) => onNavigateTo(type, value)}
        onOpenPreview={onOpenPreview}
        onFollowed={onFollowed}
      />
      {venueFirst ? (
        <>
          <VenueSection
            venueResults={venueResults}
            selectedIdx={selectedIdx}
            baseIdx={venueBaseIdx}
            {...hoverProp}
            {...queryProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
          <ArtistSection
            artistResults={artistResults}
            selectedIdx={selectedIdx}
            baseIdx={showBaseIdx}
            {...hoverProp}
            {...queryProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
        </>
      ) : (
        <>
          <ArtistSection
            artistResults={artistResults}
            selectedIdx={selectedIdx}
            baseIdx={showBaseIdx}
            {...hoverProp}
            {...queryProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
          <VenueSection
            venueResults={venueResults}
            selectedIdx={selectedIdx}
            baseIdx={venueBaseIdx}
            {...hoverProp}
            {...queryProp}
            onNavigateTo={(type, value) => onNavigateTo(type, value)}
          />
        </>
      )}
      {explain && !isDesktop && <ExplainerFootnote />}
    </div>
  );

  if (!showRail) return results;

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
  );
}
