import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUCKET_LABELS } from '@concert-crawl/types';
import { genreColor } from './genre-color';

const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');

describe('genreColor', () => {
  it('colors a sub-genre with its bucket', () => {
    expect(genreColor('alternative')).toBe('var(--genre-rock)');
    expect(genreColor('R&B')).toBe('var(--genre-hip-hop)');
  });

  it('has no color for an unbucketed or missing genre', () => {
    expect(genreColor('polka-step')).toBeNull();
    expect(genreColor('')).toBeNull();
    expect(genreColor(null)).toBeNull();
  });

  // A bucket added to the taxonomy without a token would render an
  // uncolored dot and ring, silently.
  it.each(BUCKET_LABELS)(
    'defines a dark and a light token for %s',
    (bucket) => {
      const matches = css.match(new RegExp(`--genre-${bucket}:`, 'g')) ?? [];
      expect(matches).toHaveLength(2);
    },
  );
});
