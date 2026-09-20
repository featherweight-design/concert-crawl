'use client'

// Multi-select artist picker (native following, PR 8). Two modes over one
// selection: a grid of checkbox tiles, or a search over the same index.
//
// The COMMIT lives with the caller. Onboarding already owns a primary CTA rail
// at the bottom of its card, and a second primary inside the grid would make
// the step ask twice. The picker's whole contract is "here is a selection";
// what a selection costs and when it is written is the caller's problem.
//
// SEARCH IS A MODE, NOT A SURFACE. It used to be a link to /search, which
// walked the visitor out of a committing flow holding an uncommitted
// selection: the progress strip, the skip rail and the commit CTA all
// disappeared, and the picks survived in sessionStorage with nothing on
// screen saying so. Here the rail never moves and the counter never resets —
// a row tapped in search increments exactly what a tile increments. If a
// second commit affordance ever appears in this file, the mode has become an
// overlay and the fix is wrong.
//
// The MODE and the QUERY are the caller's state, not this component's. The
// onboarding shell mounts its mobile and desktop trees at the same time, so
// state held here would let the two disagree about what is being searched.

import { useEffect, useRef } from 'react'
import { PickGrid } from './PickGrid'
import { ArtistPickTile } from './ArtistPickTile'
import { ArtistSearchRow } from './ArtistSearchRow'
import { PickedStrip } from './PickedStrip'
import { SearchField, SearchTrigger } from './SearchField'
import { ARTIST_PICKER_COPY } from './definitions/copy'
import {
  PICK_SKELETON_COUNT,
  SEARCH_SKELETON_COUNT,
} from './definitions/constants'
import type { PickArtist } from './definitions/types'
import type { ArtistSearchState } from './lib/use-artist-search'

const SkeletonRow = () => (
  <div
    aria-hidden
    style={{
      minHeight: 56,
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  />
)

const SkeletonTile = () => (
  <div
    aria-hidden
    style={{
      borderRadius: 12,
      padding: 8,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  >
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 9,
        background: 'var(--surface-2)',
      }}
    />
  </div>
)

// Both the empty and the failed grid say a headline and a sentence in the
// space the tiles would have taken. `role="alert"` only on the failure: the
// empty state is an answer, not an interruption.
const Notice = ({
  title,
  body,
  role,
}: {
  title: string
  body: string
  role?: 'alert'
}) => (
  <div role={role} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span
      className="text-fg"
      style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}
    >
      {title}
    </span>
    <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--fg-muted)' }}>
      {body}
    </span>
  </div>
)

// Both are ghost buttons rather than primaries: the step's rail is the only
// primary on screen, and a second filled button beside it would ask twice.
const GhostButton = ({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    style={{
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderRadius: 10,
      border: '1px solid var(--border-strong)',
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--fg)',
    }}
  >
    {label}
  </button>
)

const RetryButton = ({ onClick }: { onClick: () => void }) => (
  <GhostButton label={ARTIST_PICKER_COPY.errorRetry} onClick={onClick} />
)

const BackToSuggestions = ({ onClick }: { onClick: () => void }) => (
  <GhostButton label={ARTIST_PICKER_COPY.searchBack} onClick={onClick} />
)

/**
 * What the search body says, per state, and what the live region announces.
 *
 * Both are exhaustive `switch`es over the union rather than nested ternaries,
 * because the defect they replace was a state added to the union and taught to
 * only ONE of them: the body drew "You already follow those" while the live
 * region still announced "Searching artists". Written this way, a new state
 * fails to compile until every reader has been told about it, which is the
 * only version of "remember to update both" that works.
 */
const searchNoticeFor = (
  state: ArtistSearchState,
): { title: string; body: string } | null => {
  switch (state) {
    case 'rest':
      return {
        title: ARTIST_PICKER_COPY.searchRestTitle,
        body: ARTIST_PICKER_COPY.searchRestBody,
      }
    case 'none':
      return {
        title: ARTIST_PICKER_COPY.searchNoneTitle,
        body: ARTIST_PICKER_COPY.searchNoneBody,
      }
    case 'allFollowed':
      return {
        title: ARTIST_PICKER_COPY.searchAllFollowedTitle,
        body: ARTIST_PICKER_COPY.searchAllFollowedBody,
      }
    case 'typing':
    case 'results':
      return null
  }
}

/** One announcement per SETTLED state; typing says nothing, because the next
 *  state will a moment later and "searching" on every keystroke is chatter. */
const searchAnnouncementFor = (
  state: ArtistSearchState,
  count: number,
): string => {
  switch (state) {
    case 'results':
      return ARTIST_PICKER_COPY.searchResultCount(count)
    case 'none':
      return ARTIST_PICKER_COPY.searchNoneTitle
    case 'allFollowed':
      return ARTIST_PICKER_COPY.searchAllFollowedTitle
    case 'typing':
      return ''
    case 'rest':
      return ARTIST_PICKER_COPY.searchOpened
  }
}

interface ArtistPickerProps {
  artists: PickArtist[]
  /** Slugs currently selected. The caller owns the set; the picker only reads. */
  selected: ReadonlySet<string>
  onToggle: (slug: string) => void
  loading: boolean
  /**
   * The read failed. Separate from `artists.length === 0` on purpose: a
   * failure also hands back an empty list, and the two want different words.
   */
  errored?: boolean
  /** Re-runs the suggestions read. The error state's only offer. */
  onRetry?: () => void
  /** 2 on mobile, 5 on desktop (RS-07 / RS-08). Never 1, even at 320px. */
  columns: number
  /**
   * Whether the search field has replaced the grid. Owned by the caller
   * because two trees of this component are mounted at once.
   */
  searching: boolean
  searchQuery: string
  onSearchQueryChange: (next: string) => void
  onSearchOpen: () => void
  onSearchClose: () => void
  /**
   * The search read's output, threaded from the shell for the same reason the
   * suggestions are: both trees are mounted, so a fetch in here would fire
   * twice per keystroke and keep two caches that can disagree.
   */
  searchResults: PickArtist[]
  searchState: ArtistSearchState
  /**
   * The step's eyebrow/heading/lede. Rendered HERE rather than above this
   * component so the field can take its place in the same vertical box —
   * removing the head and rendering the field lower down shifts the grid,
   * which is the mode swap becoming a relayout.
   */
  head?: React.ReactNode
  /**
   * Desktop draws the trigger in the step's head rather than under the grid,
   * so the picker renders it there instead of below. The control is the same
   * object either way; only where it sits moves.
   */
  triggerAbove?: boolean
}

export const ArtistPicker = ({
  artists,
  selected,
  onToggle,
  loading,
  errored = false,
  onRetry,
  columns,
  searching,
  searchQuery,
  onSearchQueryChange,
  onSearchOpen,
  onSearchClose,
  searchResults: results,
  searchState: state,
  head = null,
  triggerAbove = false,
}: ArtistPickerProps) => {
  // Faces for the picked strip, assembled here rather than handed down: this
  // component is the only place that can see BOTH lists, and a pick can come
  // from either. The cache keeps one made in search after the query has moved
  // past it — otherwise the strip would say the selection had shrunk at
  // exactly the moment the step promises it has not.
  //
  // A ref, written after commit and read during render. Held in state it
  // would be a new Map every render, which re-renders, which writes again:
  // the same loop the search effect avoids by keying on the query text.
  const knownArtists = useRef(new Map<string, PickArtist>())
  const artistKey = artists.map((artist) => artist.slug).join(',')
  const resultKey = results.map((artist) => artist.slug).join(',')
  useEffect(() => {
    for (const artist of [...artists, ...results]) {
      knownArtists.current.set(artist.slug, artist)
    }
    // Keyed on the JOINED SLUGS, never the arrays: both are rebuilt on every
    // render, so an array dependency fires this effect every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistKey, resultKey])
  const onScreen = new Map(knownArtists.current)
  for (const artist of [...artists, ...results])
    onScreen.set(artist.slug, artist)
  const pickedArtists = Array.from(selected)
    .map((slug) => onScreen.get(slug))
    .filter((artist): artist is PickArtist => artist !== undefined)
  const notice = searchNoticeFor(state)
  const fieldRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Focus follows the mode in both directions. Opening without moving focus
  // leaves a keyboard user on a control that is no longer there; closing
  // without returning it drops them at the top of the document.
  const wasSearching = useRef(searching)
  useEffect(() => {
    if (searching === wasSearching.current) return
    wasSearching.current = searching
    if (searching) fieldRef.current?.focus()
    else triggerRef.current?.focus()
  }, [searching])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* One slot, two contents. The field REPLACES the head block rather than
          appearing after it, so nothing below the slot moves when the mode
          flips — which is the whole difference between a swap and a
          relayout. */}
      {searching ? (
        <SearchField
          ref={fieldRef}
          value={searchQuery}
          onChange={onSearchQueryChange}
          onClose={onSearchClose}
        />
      ) : (
        <>
          {head}
          {triggerAbove ? (
            <SearchTrigger ref={triggerRef} onOpen={onSearchOpen} />
          ) : null}
        </>
      )}

      {searching ? (
        <>
          <span className="sr-only" role="status">
            {searchAnnouncementFor(state, results.length)}
          </span>

          {state === 'typing' ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              aria-hidden
            >
              {Array.from({ length: SEARCH_SKELETON_COUNT }, (_, index) => (
                <SkeletonRow key={index} />
              ))}
            </div>
          ) : notice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Notice title={notice.title} body={notice.body} />
              {/* `rest` is a prompt rather than a dead end, so it offers
                  nothing; the other two need a way back. Never /search again —
                  that would reintroduce the exit this mode exists to close. */}
              {state === 'rest' ? null : (
                <BackToSuggestions onClick={onSearchClose} />
              )}
            </div>
          ) : (
            <div
              role="group"
              aria-label={ARTIST_PICKER_COPY.groupLabel}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {results.map((artist) => (
                <ArtistSearchRow
                  key={artist.slug}
                  artist={artist}
                  selected={selected.has(artist.slug)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}

          {/* The count comes from the SELECTION, the faces from what this
              tree can resolve. They differ after a remount, and the rail is
              the thing they both have to agree with. */}
          <PickedStrip count={selected.size} picked={pickedArtists} />
        </>
      ) : loading ? (
        // Placeholders keep the grid at roughly its final height, so the CTA
        // rail below does not jump under a thumb already on its way to it.
        <div role="status" aria-label={ARTIST_PICKER_COPY.loading}>
          <PickGrid columns={columns}>
            {Array.from({ length: PICK_SKELETON_COUNT }, (_, index) => (
              <SkeletonTile key={index} />
            ))}
          </PickGrid>
        </div>
      ) : errored ? (
        <div
          role="alert"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Notice
            title={ARTIST_PICKER_COPY.errorTitle}
            body={ARTIST_PICKER_COPY.errorBody}
          />
          {onRetry ? <RetryButton onClick={onRetry} /> : null}
        </div>
      ) : artists.length === 0 ? (
        <Notice
          title={ARTIST_PICKER_COPY.emptyTitle}
          body={ARTIST_PICKER_COPY.emptyBody}
        />
      ) : (
        <div role="group" aria-label={ARTIST_PICKER_COPY.groupLabel}>
          <PickGrid columns={columns}>
            {artists.map((artist) => (
              <ArtistPickTile
                key={artist.slug}
                artist={artist}
                selected={selected.has(artist.slug)}
                onToggle={onToggle}
              />
            ))}
          </PickGrid>
        </div>
      )}

      {/* Under the grid on the phone, where it has always been. On desktop
          the caller draws it beside the heading instead: a full-width strip
          below a five-column grid reads as a sixth, empty row of tiles. */}
      {searching || triggerAbove ? null : (
        <SearchTrigger ref={triggerRef} onOpen={onSearchOpen} />
      )}
    </div>
  )
}
