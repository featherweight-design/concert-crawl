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
  type PickArtist,
} from '@/components/consumer/artist-picker'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.pickArtists

interface PickArtistsProps {
  artists: PickArtist[]
  selected: ReadonlySet<string>
  onToggle: (slug: string) => void
  loading: boolean
  /** The suggestions read failed, which is not the same as it being empty. */
  errored: boolean
  columns: number
}

export function PickArtists({
  artists,
  selected,
  onToggle,
  loading,
  errored,
  columns,
}: PickArtistsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <StepHeading>{copy.heading}</StepHeading>
      <Lede>{copy.lede}</Lede>
      <ArtistPicker
        artists={artists}
        selected={selected}
        onToggle={onToggle}
        loading={loading}
        errored={errored}
        columns={columns}
      />
    </div>
  )
}
