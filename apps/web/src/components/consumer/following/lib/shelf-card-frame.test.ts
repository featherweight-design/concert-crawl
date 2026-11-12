import { describe, expect, it } from 'vitest';
import { shelfCardFrame } from './shelf-card-frame';

// Board values from addendum-2 `shelf-see-all-m`:
// border:1px solid rgba(genre,0.55); background:#0E1226;
// box-shadow:0 0 26px rgba(genre,0.14).
describe('shelfCardFrame', () => {
  it('draws the genre edge at 55%, the elevated fill and a 26px glow at 14%', () => {
    expect(shelfCardFrame('var(--genre-rock)')).toEqual({
      background: 'var(--bg-elevated)',
      border:
        '1px solid color-mix(in oklch, var(--genre-rock) 55%, transparent)',
      boxShadow:
        '0 0 26px color-mix(in oklch, var(--genre-rock) 14%, transparent)',
    });
  });

  it('keeps the neutral hairline and no glow without a genre', () => {
    expect(shelfCardFrame(null)).toEqual({
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      boxShadow: undefined,
    });
  });
});
