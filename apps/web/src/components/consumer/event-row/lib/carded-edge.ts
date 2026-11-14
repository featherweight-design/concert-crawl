import type { CSSProperties } from 'react';

interface CardedEdgeOptions {
  /**
   * Paint the fade as a `backgroundImage` over a transparent ground instead of
   * a `background` over `--surface-1`. For a card whose surface color comes
   * from a class with a hover state (`bg-surface-1 hover:bg-surface-2`): the
   * `background` shorthand inline would pin the color and kill the hover.
   */
  hoverSafe?: boolean;
}

/** The card fill: `--bg-elevated` at 72%, translucent so the page shows through. */
const CARD_FILL = 'color-mix(in oklch, var(--bg-elevated) 72%, transparent)';

/**
 * A carded row's genre treatment (B+ rule 2): the 2px left edge in the lead
 * genre's color, fading into the card's surface. One recipe, so every carded
 * row (Browse, Venue, the artist page's shows, My shows) reads the same. Pair
 * it with `border border-border bg-surface-1` for the rest of the card.
 */
export const cardedEdge = (
  genre: string,
  { hoverSafe = false }: CardedEdgeOptions = {},
): CSSProperties => ({
  borderRadius: 12,
  borderLeftWidth: 2,
  borderLeftColor: genre,
  ...(hoverSafe
    ? {
        backgroundImage: `linear-gradient(90deg, color-mix(in oklch, ${genre} 10%, transparent), transparent 45%)`,
      }
    : {
        // The board draws 10% genre into a translucent `--bg-elevated`, so the
        // page glow shows through the row (`bp-browse`, `bp-m-browse_m`); it
        // was 7% into the opaque `--surface-1`.
        background: `linear-gradient(90deg, color-mix(in oklch, ${genre} 10%, ${CARD_FILL}), ${CARD_FILL} 45%)`,
      }),
});
