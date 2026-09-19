import React from 'react'

import { LANDING_COPY } from '@/app/_components/definitions/copy'
import { BRAND_INK, BRAND_PAPER } from '@/lib/definitions/brand'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

export interface SiteCardProps {
  width: number
  height: number
}

/**
 * The card a bare `concertcrawl.app` link unfurls into.
 *
 * Deliberately not the event poster: there is no show to name here, so it
 * carries the wordmark and the landing page's own subheading and nothing else.
 * Both strings are the ones already on the page it represents — a social card
 * that says something the destination does not is its own small lie.
 *
 * Satori-safe by construction: flex boxes, flat fills and the four faces
 * `loadShareFonts` provides. No SVG, no shorthand, no percentage root.
 */
export const SiteCard = ({ width, height }: SiteCardProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      width,
      height,
      padding: 88,
      backgroundColor: BRAND_PAPER,
    }}
  >
    <div
      style={{
        display: 'flex',
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: 108,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: BRAND_INK,
      }}
    >
      {CONSUMER_COPY.share.wordmark}
    </div>
    {/* The rule is the only non-type element on the card: it separates the
        mark from the sentence without introducing a second colour. */}
    <div
      style={{
        display: 'flex',
        width: 132,
        height: 6,
        marginTop: 36,
        marginBottom: 36,
        backgroundColor: BRAND_INK,
      }}
    />
    <div
      style={{
        display: 'flex',
        fontFamily: 'Inter',
        fontWeight: 400,
        fontSize: 40,
        lineHeight: 1.3,
        color: BRAND_INK,
        opacity: 0.78,
      }}
    >
      {LANDING_COPY.hero.subheading}
    </div>
  </div>
)
