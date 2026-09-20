'use client'

// Onboarding step 7 of 8. Presentational: the shell owns the suggestions
// fetch, the selection and the commit, because both the mobile and the desktop
// tree render this at once and only one of them is visible.
//
// There is no commit button in here. The shell's CTA rail is the commit, so
// the step body stays a grid and a sentence.

import { Eyebrow, StepHeading, Lede } from './_primitives'
import {
  ArtistPicker,
  PICK_COLUMNS_DESKTOP,
  type PickArtist,
} from '@/components/consumer/artist-picker'
import type { ArtistSearchState } from '@/components/consumer/artist-picker/lib/use-artist-search'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.pickArtists

interface PickArtistsProps {
  artists: PickArtist[]
  selected: ReadonlySet<string>
  onToggle: (slug: string) => void
  loading: boolean
  /** The suggestions read failed, which is not the same as it being empty. */
  errored: boolean
  onRetry: () => void
  columns: number
  /**
   * Search state, threaded from the shell rather than held here: both the
   * mobile and the desktop tree render this step at once, and two copies of
   * the mode would let them disagree about what is being searched.
   */
  searching: boolean
  searchQuery: string
  onSearchQueryChange: (next: string) => void
  onSearchOpen: () => void
  onSearchClose: () => void
  searchResults: PickArtist[]
  searchState: ArtistSearchState
}

export function PickArtists({
  artists,
  selected,
  onToggle,
  loading,
  errored,
  onRetry,
  columns,
  searching,
  searchQuery,
  onSearchQueryChange,
  onSearchOpen,
  onSearchClose,
  searchResults,
  searchState,
}: PickArtistsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ArtistPicker
        // Handed to the picker rather than rendered above it: the field takes
        // this block's place in the picker's own first slot, so the swap moves
        // nothing below it.
        head={
          <>
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <StepHeading>{copy.heading}</StepHeading>
            <Lede>{copy.lede}</Lede>
          </>
        }
        artists={artists}
        selected={selected}
        onToggle={onToggle}
        loading={loading}
        errored={errored}
        onRetry={onRetry}
        columns={columns}
        // Desktop's grid is five wide, so a full-width trigger under it reads
        // as a sixth, empty row. Above the grid it reads as what it is: the
        // other way to find someone.
        triggerAbove={columns >= PICK_COLUMNS_DESKTOP}
        searching={searching}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchOpen={onSearchOpen}
        onSearchClose={onSearchClose}
        searchResults={searchResults}
        searchState={searchState}
      />
    </div>
  )
}
