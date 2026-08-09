// The "find more artists" affordance at the foot of the list.
//
// A labelled ROW, not a button: "+ Follow more" sitting under a column of
// Following controls reads like it might follow everything at once. Naming the
// destination and saying what happens there removes the ambiguity.

import Link from 'next/link'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import {
  FIND_ARTISTS_HREF,
  ROW_ART_SIZE,
  ROW_ART_SIZE_NARROW,
} from './definitions/constants'
import { GlyphChevron, GlyphSearch } from './Glyphs'

const COPY = MY_SHOWS_ARTISTS_COPY.find

export const FindArtistsRow = ({ narrow = false }: { narrow?: boolean }) => {
  const box = narrow ? ROW_ART_SIZE_NARROW : ROW_ART_SIZE
  return (
    <Link
      href={FIND_ARTISTS_HREF}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderTop: '1px solid var(--border)',
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: box,
          height: box,
          flexShrink: 0,
          borderRadius: 8,
          border: '1px dashed var(--border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--signal)',
        }}
      >
        <GlyphSearch size={19} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14.5,
            fontWeight: 800,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
          }}
        >
          {COPY.title}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--fg-subtle)',
            marginTop: 3,
          }}
        >
          {COPY.body}
        </span>
      </span>
      <span aria-hidden style={{ color: 'var(--fg-subtle)', display: 'flex' }}>
        <GlyphChevron size={15} />
      </span>
    </Link>
  )
}
