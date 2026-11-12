import type { CSSProperties } from 'react';

/**
 * A carded row's genre treatment (B+ rule 2): the 2px left edge in the lead
 * genre's color, fading into the card's surface. One recipe, so every carded
 * row (Browse, Venue, the artist page's shows) reads the same. Pair it with
 * `border border-border bg-surface-1` for the rest of the card.
 */
export const cardedEdge = (genre: string): CSSProperties => ({
  borderRadius: 12,
  borderLeftWidth: 2,
  borderLeftColor: genre,
  background: `linear-gradient(90deg, color-mix(in oklch, ${genre} 7%, var(--surface-1)), var(--surface-1) 45%)`,
});
