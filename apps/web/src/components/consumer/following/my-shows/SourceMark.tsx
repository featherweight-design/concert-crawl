// Per-row provenance: this follow arrived from a Spotify sync rather than a
// tap. Spotify is a SOURCE, not a second information architecture — the row is
// otherwise identical, and the control on it does the same thing.
//
// The word is visible rather than sr-only because the reassurance in the list
// footnote ("unfollowing here won't touch your Spotify library") only makes
// sense if you can see which rows it is talking about.

import { SpotifyLogo } from '@/components/brand/spotify-logo/SpotifyLogo'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'

export const SourceMark = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--fg-subtle)',
    }}
  >
    <SpotifyLogo size={9} />
    {MY_SHOWS_ARTISTS_COPY.source.spotify}
  </span>
)
