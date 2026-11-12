import type { CSSProperties } from 'react';

/**
 * The Coming to Denver card's frame (`shelf-see-all-m`, `browse-active-320`):
 * the `bg-elevated` fill, a 1px edge at 55% of the lead genre, and a 26px glow
 * at 14%. A show with no bucketed genre keeps the neutral hairline and no glow.
 */
export const shelfCardFrame = (edge: string | null): CSSProperties => ({
  background: 'var(--bg-elevated)',
  border: `1px solid ${
    edge === null
      ? 'var(--border)'
      : `color-mix(in oklch, ${edge} 55%, transparent)`
  }`,
  boxShadow:
    edge === null
      ? undefined
      : `0 0 26px color-mix(in oklch, ${edge} 14%, transparent)`,
});
