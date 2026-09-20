'use client'

// The picks, pinned, while the grid is off screen.
//
// The live step's worst behaviour is that the selection survives in
// sessionStorage and NOTHING ON SCREEN SAYS SO. Leaving the grid to search
// therefore looks exactly like losing what you picked. This is the structural
// fix: in search mode the count and the faces stay visible, so the rail's
// "Follow 5 artists" has something to point at.
//
// READ-ONLY. Tapping a face is not an unfollow — unpicking happens on the tile
// or the row, where the check glyph says what the tap will do. A strip that
// silently removed a pick would be a third way to change the selection, drawn
// smaller than the other two.

import { Panel } from '@/components/consumer/image-slot'
import { ARTIST_PICKER_COPY } from './definitions/copy'
import { PICKED_STRIP_FACES } from './definitions/constants'
import type { PickArtist } from './definitions/types'

interface PickedStripProps {
  /** Every pick, resolvable to a face or not. */
  count: number
  /**
   * The ones this tree can draw. Deliberately separate from `count`: a pick
   * made in search has no card here after the tree remounts — the upgrade
   * round trip — and counting only what can be drawn would report the
   * selection as smaller than it is, in the one place that exists to promise
   * nothing was lost.
   */
  picked: PickArtist[]
}

export const PickedStrip = ({ count, picked }: PickedStripProps) => {
  if (count === 0) return null
  const faces = picked.slice(0, PICKED_STRIP_FACES)

  return (
    <div
      className="flex items-center"
      style={{
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          flexShrink: 0,
        }}
      >
        {ARTIST_PICKER_COPY.pickedCount(count)}
      </span>
      {/* Overlapped rather than spaced: six 26px faces in a row would take the
          strip past the width of a 320px card, and the faces are a reassurance
          rather than a list to read. */}
      <span aria-hidden className="flex min-w-0 flex-1 items-center">
        {faces.map((artist, index) => (
          <span
            key={artist.slug}
            style={{
              marginLeft: index === 0 ? 0 : -8,
              borderRadius: 26,
              border: '1.5px solid var(--surface-1)',
              display: 'inline-flex',
              flexShrink: 0,
            }}
          >
            <Panel
              surface="artist"
              name={artist.name}
              photoUrl={artist.photoUrl}
              size={26}
              radius={13}
            />
          </span>
        ))}
      </span>
    </div>
  )
}
