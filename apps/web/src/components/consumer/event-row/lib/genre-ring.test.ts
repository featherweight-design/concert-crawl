import { describe, expect, it } from 'vitest';

import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { genreRing } from './genre-ring';

describe('genreRing', () => {
  // shelf-see-all-m: `0 0 0 1.25px <genre>, 0 0 20px rgba(<genre>,0.4)`.
  it('draws a 1.25px genre ring with a 20px glow at 40%', () => {
    expect(genreRing('var(--genre-soul)')).toBe(
      '0 0 0 1.25px var(--genre-soul), 0 0 20px color-mix(in oklch, var(--genre-soul) 40%, transparent)',
    );
  });

  // addendum-2 item 23: an ungenred thumbnail gets a neutral ring and no glow,
  // matching GenreDot, which drops its glow for an unbucketed genre.
  it('keeps the ring but drops the glow for the neutral fallback', () => {
    expect(genreRing(NEUTRAL_GENRE_COLOR)).toBe(
      `0 0 0 1.25px ${NEUTRAL_GENRE_COLOR}`,
    );
  });
});
