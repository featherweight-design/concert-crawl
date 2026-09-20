'use client'

// One search result inside the tour.
//
// THE ROW IS THE CHECKBOX, exactly as the tile is. That is not a styling
// choice: /search's own artist row carries a Follow button that WRITES on tap,
// and the step batches one write at its rail. Rendering that row here would
// put two commit models over one selection, which is the defect this whole
// surface exists to avoid. A result speaks the grid's language or it does not
// belong in the grid's step.

import { Panel } from '@/components/consumer/image-slot'
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

interface ArtistSearchRowProps {
  artist: PickArtist
  selected: boolean
  onToggle: (slug: string) => void
}

export const ArtistSearchRow = ({
  artist,
  selected,
  onToggle,
}: ArtistSearchRowProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={() => onToggle(artist.slug)}
    className="flex w-full cursor-pointer items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    style={{
      // 44 minimum on the whole row, not on the check square: the target is
      // the row.
      minHeight: 56,
      gap: 10,
      padding: 8,
      borderRadius: 12,
      background: selected ? 'var(--surface-2)' : 'var(--surface-1)',
      border: `1px solid ${selected ? 'var(--signal)' : 'var(--border)'}`,
      // Three signals at once, as on the tile: glyph, border and fill. Light
      // theme cannot reach AA on the border alone.
      boxShadow: selected ? 'inset 0 0 0 1px var(--signal)' : 'none',
    }}
  >
    <span aria-hidden style={{ flexShrink: 0 }}>
      <Panel
        surface="artist"
        name={artist.name}
        photoUrl={artist.photoUrl}
        size={40}
        radius={8}
      />
    </span>

    <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
      <span
        // Named for the walk that reads it: a row's text runs name-then-date,
        // so the artist a search pick is ABOUT cannot be recovered from the
        // row's textContent without re-parsing the layout.
        data-testid="pick-name"
        className="block overflow-hidden text-ellipsis whitespace-nowrap text-fg"
        style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em' }}
      >
        {artist.name}
      </span>
      <span
        className="block overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.06em',
          color: 'var(--fg-subtle)',
        }}
      >
        {/* Never an inert or disabled row. An artist with nothing on the books
            is followable and is arguably the best reason to follow anyone:
            being told the day they book the next one is the whole feature. */}
        {artist.dateLabel ?? FOLLOWING_COPY.cardNoDate}
      </span>
    </span>

    <span
      aria-hidden
      className="flex items-center justify-center"
      style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: 26,
        background: selected ? 'var(--signal)' : 'transparent',
        border: `1.5px solid ${selected ? 'var(--signal)' : 'var(--border-strong)'}`,
        color: selected ? 'var(--fg-on-accent)' : 'transparent',
      }}
    >
      <CheckGlyph />
    </span>
  </button>
)
