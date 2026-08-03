import { SEPARATORS } from '@/components/consumer/event-title-block/lib/supportingLine'

/**
 * Every customer-facing string the row renders. Provenance labels match the
 * ones admin already uses, so a price is described the same way wherever it
 * is read.
 */
export const EVENT_ROW_COPY = {
  // Rendered glyphs, kept here rather than inline in JSX. Each is decorative:
  // every one of them sits behind aria-hidden with an sr-only sentence beside
  // it, so a screen reader hears the meaning rather than the symbol.
  glyphs: {
    separator: SEPARATORS.middot,
    deltaDown: '↓',
    deltaUp: '↑',
  },
  price: {
    fromPrefix: 'from',
    tba: 'tba',
    soldOut: 'Sold out',
  },
  provenance: {
    boxoffice: 'Box office',
    standard: 'Community',
    resale: 'Resale',
  },
  freshness: {
    stalePrefix: 'Stale',
  },
  meta: {
    following: 'Following',
  },
  a11y: {
    watchingTick: (artist: string) => `You are watching ${artist}`,
    // Replaces the chip's visible label rather than adding to it, so it has to
    // carry the word itself. The row has no room for the Spotify glyph the old
    // browse-card chip used, so the source moves in here too.
    following: 'Following this artist on Spotify',
    priceProvenance: (label: string) => `Price source: ${label}`,
    stalePrice: (relTime: string) => `Stale price, last checked ${relTime}`,
    savedDelta: (amount: string) => `Down ${amount} since you started watching`,
    savedDeltaUp: (amount: string) => `Up ${amount} since you started watching`,
  },
} as const
