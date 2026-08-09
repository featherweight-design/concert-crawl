// Nobody followed yet.
//
// Both CTAs go somewhere known-static, which is why they are buttons rather
// than a chip rail: there is nothing to pick from until you have followed
// someone. The eyebrow is the one sanctioned use of --accent on this surface;
// everything follow-shaped is --signal.

import Link from 'next/link'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import {
  BROWSE_HREF,
  FIND_ARTISTS_HREF,
  WATCHING_HREF,
} from './definitions/constants'
import { GlyphPlus } from './Glyphs'
import { Mono } from './Mono'

const COPY = MY_SHOWS_ARTISTS_COPY.empty

const buttonBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 46,
  padding: '13px 20px',
  borderRadius: 10,
  fontFamily: 'Inter, system-ui, sans-serif',
  letterSpacing: '-0.01em',
  textDecoration: 'none',
} as const

interface ArtistsEmptyProps {
  /** Signed in, plan cannot follow. Swaps the primary move for one that works. */
  locked: boolean
  /** The desktop layout, which is wider and lays the CTAs side by side. */
  desktop?: boolean
}

export const ArtistsEmpty = ({
  locked,
  desktop = false,
}: ArtistsEmptyProps) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: desktop ? 'flex-start' : 'center',
      textAlign: 'center',
      padding: desktop ? '70px 0' : '48px 26px',
    }}
  >
    <span
      aria-hidden
      style={{
        width: desktop ? 60 : 54,
        height: desktop ? 60 : 54,
        borderRadius: desktop ? 15 : 14,
        border: '1px dashed var(--border-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-subtle)',
        marginBottom: desktop ? 20 : 18,
      }}
    >
      <GlyphPlus size={desktop ? 22 : 20} />
    </span>

    <Mono size={desktop ? 10.5 : 10} color="var(--accent)" ls="0.18em">
      {COPY.eyebrow}
    </Mono>

    <h2
      style={{
        margin: 0,
        fontSize: desktop ? 28 : 22,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        color: 'var(--fg)',
        marginTop: desktop ? 12 : 11,
      }}
    >
      {COPY.headline}
    </h2>

    <p
      style={{
        margin: 0,
        fontSize: desktop ? 14.5 : 13.5,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        marginTop: desktop ? 10 : 9,
        maxWidth: desktop ? 430 : 290,
      }}
    >
      {COPY.body}
    </p>

    <div
      style={{
        display: 'flex',
        gap: desktop ? 10 : 8,
        marginTop: desktop ? 24 : 22,
        ...(desktop
          ? {}
          : { flexDirection: 'column', width: '100%', maxWidth: 300 }),
      }}
    >
      <Link
        href={locked ? BROWSE_HREF : FIND_ARTISTS_HREF}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          ...buttonBase,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          border: '1px solid var(--signal)',
          fontWeight: 800,
          fontSize: 14.5,
        }}
      >
        {locked ? COPY.primaryLocked : COPY.primary}
      </Link>
      <Link
        href={WATCHING_HREF}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          ...buttonBase,
          background: 'transparent',
          color: 'var(--fg)',
          border: '1px solid var(--border-strong)',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {COPY.secondary}
      </Link>
    </div>
  </div>
)
