'use client'

// One tile in the multi-select picker (nf-cold-start.jsx `ArtistPick`).
//
// THE TILE IS THE CHECKBOX (ACC-06). The badge floated on the artwork is a
// state readout, not a second control — a 12-artist grid has to be 12 tab
// stops, not 24, or keyboard users pay double for a grid that looks simple.
//
// Nothing here writes. Selection is a client-side intent the caller commits in
// one bulk request, which is why the badge is a check/plus and never a lock:
// an unentitled visitor may select as freely as anyone, and the gate is on the
// button that commits, not on the tiles.

import { CardArt } from '@/components/consumer/following/ShelfCard'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import type { PickArtist } from './definitions/types'

const CheckGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3.2 8.4l3.1 3.1 6.5-6.9"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PlusGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

interface ArtistPickTileProps {
  artist: PickArtist
  selected: boolean
  onToggle: (slug: string) => void
}

export const ArtistPickTile = ({
  artist,
  selected,
  onToggle,
}: ArtistPickTileProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={() => onToggle(artist.slug)}
    className="flex cursor-pointer flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    style={{
      // PK-01 through PK-04. Three signals at once, deliberately: the check
      // glyph, the border colour and the fill. Light theme cannot reach AA on
      // the border alone, so colour is never asked to carry it (PK-10).
      borderRadius: 12,
      padding: 8,
      gap: 8,
      background: selected ? 'var(--surface-2)' : 'var(--surface-1)',
      border: `1px solid ${selected ? 'var(--signal)' : 'var(--border)'}`,
      boxShadow: selected ? 'inset 0 0 0 1px var(--signal)' : 'none',
    }}
  >
    <span
      aria-hidden
      className="relative block w-full overflow-hidden"
      style={{ aspectRatio: '1 / 1', borderRadius: 9 }}
    >
      <CardArt name={artist.name} photoUrl={artist.photoUrl} />
      <span
        className="absolute flex items-center justify-center"
        style={{
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: 24,
          background: selected ? 'var(--signal)' : 'rgba(0,0,0,0.5)',
          border: `1.5px solid ${selected ? 'var(--signal)' : 'rgba(255,255,255,0.6)'}`,
          color: selected ? 'var(--fg-on-accent)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {selected ? <CheckGlyph /> : <PlusGlyph />}
      </span>
    </span>

    <span
      className="block overflow-hidden text-ellipsis whitespace-nowrap text-fg"
      style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.01em' }}
    >
      {artist.name}
    </span>

    <span
      className="block overflow-hidden text-ellipsis whitespace-nowrap"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.06em',
        marginTop: 3,
        color: 'var(--fg-subtle)',
      }}
    >
      {artist.dateLabel ?? FOLLOWING_COPY.cardNoDate}
    </span>
  </button>
)
