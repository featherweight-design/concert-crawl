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

  // A bare fragment href only scrolls — the next Tab would resume from the
  // link, i.e. straight back into Spotify's tab stops, which is the exact
  // thing this control exists to skip. Move focus to the target so the tab
  // order genuinely continues past the iframe. The target is a layout block
  // and not natively focusable, hence tabIndex -1 (programmatic focus only,
  // never a stop of its own).
  const skip = (evt: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId)
    if (!target) return
    evt.preventDefault()
    target.tabIndex = -1
    // focus() scrolls the target into view on its own, so the cancelled
    // fragment navigation costs us nothing.
    target.focus()
  }

  return (
    <a className="ap-skip" href={`#${targetId}`} onClick={skip}>
      {ARTIST_COPY.playerSkip}
    </a>
  )
}
