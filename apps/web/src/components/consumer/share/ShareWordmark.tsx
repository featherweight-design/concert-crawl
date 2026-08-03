import React from 'react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

/**
 * The `ConcertCrawl` footer signature.
 *
 * Set as plain text, not a logo glyph — the design handoff's §1 is explicit
 * that the poster carries no mark. Kept as its own component because it is the
 * one element that must look identical on every card direction, and inlining
 * the letter-spacing in three places is how that stops being true.
 */
export interface ShareWordmarkProps {
  size: number
  color: string
}

export const ShareWordmark = ({ size, color }: ShareWordmarkProps) => (
  <div
    style={{
      display: 'flex',
      fontFamily: 'Inter',
      fontWeight: 900,
      fontSize: size,
      letterSpacing: '-0.04em',
      lineHeight: 1,
      color,
    }}
  >
    {CONSUMER_COPY.share.wordmark}
  </div>
)
