import { describe, expect, it } from 'vitest';
import { KNOWN_TOP_LEVEL_SEGMENTS } from '@/proxy';
import { FEATURE_CARDS } from './releases';

// B+ B21: What's new is a feature page fed from releases.ts.
describe('FEATURE_CARDS', () => {
  it('runs in the board order, one card per capability', () => {
    expect(FEATURE_CARDS.map((card) => card.art)).toEqual([
      'venues',
      'watching',
      'crews',
      'passport',
      'prices',
    ]);
  });

  it('gives every card its own rank', () => {
    const ranks = FEATURE_CARDS.map((card) => card.rank);
    expect(new Set(ranks).size).toBe(ranks.length);
  });

  it('only links to real routes inside the app', () => {
    for (const card of FEATURE_CARDS) {
      if (!card.cta) continue;
      const { href } = card.cta;
      // Not protocol-relative (`//host`), which would leave the app.
      expect(href).toMatch(/^\/(?!\/)/);
      const segment = href.split('/')[1] ?? '';
      if (segment !== '')
        expect(KNOWN_TOP_LEVEL_SEGMENTS.has(segment)).toBe(true);
    }
  });
});
