// "Following" highlighting surfaces (#763 PR 6) — pixel-matched to the
// design handoff mock design/design_handoff_spotify_sync/follow-highlight.jsx.
// Design lock: neutral + Spotify-marked, NEVER --accent (accent is reserved
// for Watching). The SpotifyLogo glyph is the only place --spotify-green
// appears.
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'

const copy = SPOTIFY_COPY.followHighlight

// Browse-card chip — renders first in the card's chip row, ahead of the
// genre chips.
export const FollowingChip = () => (
  <span
    className="inline-flex items-center whitespace-nowrap rounded-[5px] border border-border-strong bg-surface-3 text-fg"
    style={{
      gap: 5,
      padding: '3px 8px 3px 5px',
      fontFamily: 'var(--font-ui)',
      fontWeight: 700,
      fontSize: 10.5,
      letterSpacing: '-0.005em',
      lineHeight: 1.3,
    }}
  >
    <SpotifyLogo size={13} />
    <span aria-hidden>{copy.chip}</span>
    <span className="sr-only">{copy.chipAria}</span>
  </span>
)

// Hero-card eyebrow badge — replaces the accent "★ Tonight's pick" badge in
// the hero's top-left slot when the headliner/support matches a followed
// artist.
export const HeroFollowingBadge = () => (
  <span
    className="inline-flex items-center rounded-[6px] border border-border-strong bg-surface-1 text-fg"
    style={{ gap: 6, padding: '4px 9px' }}
  >
    <SpotifyLogo size={13} />
    <span
      aria-hidden
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {copy.chip}
    </span>
    <span className="sr-only">{copy.chipAria}</span>
  </span>
)

interface DetailFollowStripProps {
  artists: string[]
}

// Event-detail attribution strip — sits directly under the Watching pill and
// names the matched artist(s): "You follow X on Spotify".
export const DetailFollowStrip = ({ artists }: DetailFollowStripProps) => {
  if (artists.length === 0) return null
  return (
    <div
      className="flex items-center rounded-[12px] border border-border bg-surface-1"
      style={{ gap: 11, padding: '11px 13px' }}
    >
      <SpotifyLogo size={30} />
      <p
        className="min-w-0 flex-1 text-fg"
        style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}
      >
        {copy.strip(artists)}
      </p>
    </div>
  )
}
