import { describe, expect, it } from 'vitest';

import { genreRing } from './genre-ring';

describe('genreRing', () => {
  // shelf-see-all-m: `0 0 0 1.25px <genre>, 0 0 20px rgba(<genre>,0.4)`.
  it('draws a 1.25px genre ring with a 20px glow at 40%', () => {
    expect(genreRing('var(--genre-soul)')).toBe(
      '0 0 0 1.25px var(--genre-soul), 0 0 20px color-mix(in oklch, var(--genre-soul) 40%, transparent)',
    );
  });
});
