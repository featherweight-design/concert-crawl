'use client'

// Multi-select artist picker (native following, PR 8). Grid of checkbox tiles,
// a dashed escape to search underneath, and nothing else — no commit button.
//
// The COMMIT lives with the caller. Onboarding already owns a primary CTA rail
// at the bottom of its card, and a second primary inside the grid would make
// the step ask twice. The picker's whole contract is "here is a selection";
// what a selection costs and when it is written is the caller's problem.

import Link from 'next/link'
import { PickGrid } from './PickGrid'
import { ArtistPickTile } from './ArtistPickTile'
import { ARTIST_PICKER_COPY } from './definitions/copy'
import { PICK_SKELETON_COUNT } from './definitions/constants'
import type { PickArtist } from './definitions/types'

const SearchGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M10.4 10.4L14 14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
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
  /** 2 on mobile, 5 on desktop (RS-07 / RS-08). Never 1, even at 320px. */
  columns: number
}

export const ArtistPicker = ({
  artists,
  selected,
  onToggle,
  loading,
  errored = false,
  columns,
}: ArtistPickerProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {loading ? (
      // Placeholders keep the grid at roughly its final height, so the CTA rail
      // below does not jump under a thumb already on its way to it.
      <div role="status" aria-label={ARTIST_PICKER_COPY.loading}>
        <PickGrid columns={columns}>
          {Array.from({ length: PICK_SKELETON_COUNT }, (_, index) => (
            <SkeletonTile key={index} />
          ))}
        </PickGrid>
      </div>
    ) : errored ? (
      <Notice
        title={ARTIST_PICKER_COPY.errorTitle}
        body={ARTIST_PICKER_COPY.errorBody}
        role="alert"
      />
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

    <Link
      href="/search"
      className="flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={{
        minHeight: 44,
        borderRadius: 10,
        border: '1px dashed var(--border-strong)',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--fg-muted)',
      }}
    >
      <SearchGlyph />
      {ARTIST_PICKER_COPY.searchEscape}
    </Link>
  </div>
)
