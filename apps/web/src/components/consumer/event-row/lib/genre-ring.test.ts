import { describe, expect, it } from 'vitest';

import { genreRing } from './genre-ring';

describe('genreRing', () => {
  it('draws a 1.25px genre ring with a 35% glow', () => {
    expect(genreRing('var(--genre-soul)')).toBe(
      '0 0 0 1.25px var(--genre-soul), 0 0 10px color-mix(in oklch, var(--genre-soul) 35%, transparent)',
    );
  });
});
