import React from 'react';

import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

/**
 * The footer signature, set as text (satori draws no logo glyph).
 *
 * With `accent` it is the B+ two-tone wordmark the share boards draw:
 * `concert` in the ink and `crawl.` in the accent, at CCWordmark's weight and
 * tracking. Without it, the older single-ink `ConcertCrawl` the Passport card
 * still uses. One component so every card's signature stays in step.
 */
export interface ShareWordmarkProps {
  size: number;
  color: string;
  /** The `crawl.` colour. Omitted, the single-ink signature draws. */
  accent?: string;
}

export const ShareWordmark = ({ size, color, accent }: ShareWordmarkProps) => (
  <div
    style={{
      display: 'flex',
      fontFamily: 'Inter',
      fontWeight: 900,
      fontSize: size,
      letterSpacing: accent === undefined ? '-0.04em' : '-0.025em',
      lineHeight: 1,
      color,
    }}
  >
    {accent === undefined ? (
      CONSUMER_COPY.share.wordmark
    ) : (
      <>
        <span>{BRAND_COPY.wordmark.lead}</span>
        <span style={{ color: accent }}>{BRAND_COPY.wordmark.accent}</span>
      </>
    )}
  </div>
);
