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
  // uncolored dot and ring, silently; one with no Light override would put a
  // pale dot on a light ground.
  const [dark = '', light = ''] = css.split(":root[data-theme='light']");
  it.each(BUCKET_LABELS)(
    'defines a dark and a light token for %s',
    (bucket) => {
      expect(dark).toContain(`--genre-${bucket}:`);
      expect(light.slice(0, light.indexOf('}'))).toContain(
        `--genre-${bucket}:`,
      );
    },
  );
});
