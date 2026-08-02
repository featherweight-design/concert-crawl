import React from 'react'

import { ARTIST_COPY } from '../definitions/copy'

/**
 * A labelled route past the iframe. We do not own Spotify's internal tab
 * stops, so the least we can do is offer one keystroke around them.
 *
 * Returns null on a falsy target: with no shows the player is the LAST block,
 * and a "skip to shows" link would send focus backwards past content the user
 * has already read. Styling (hidden until focus, 44px when visible) lives in
 * `.ap-skip` — a `:focus` rule cannot be expressed inline.
 */
export const EmbedSkipLink = ({ targetId }: { targetId: string | null }) => {
  if (!targetId) return null
  return (
    <a className="ap-skip" href={`#${targetId}`}>
      {ARTIST_COPY.playerSkip}
    </a>
  )
}
