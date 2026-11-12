import { describe, expect, it } from 'vitest';

import { THEME_NAMES, THEMES } from '@/theme/themes';
import { VENUE_GLYPHS } from '@/components/consumer/venue-glyph/definitions/glyphs';
import { STAMP_ACCENTS } from '@/lib/passport/stamp';
import { AA_TEXT_CONTRAST, contrastRatio, pillInkFor } from './pill-ink';

// The three palest venue ring colours (`to`), by relative luminance.
const PALEST = ['#FFE36B', '#C9F26E', '#7AE6FF'] as const;

const ratioOn = (
  fill: string,
  token: 'bg' | 'fg',
  theme: 'light' | 'electric',
) => contrastRatio(fill, THEMES[theme][token] ?? '');

describe('pillInkFor', () => {
  // The bug this fixes: `--bg` on the palest venue fills is about 1.2:1 on
  // Light, measured here so the number is on record.
  it.each(PALEST)(
    'Light: %s fails AA with --bg, so the pill takes --fg',
    (fill) => {
      expect(ratioOn(fill, 'bg', 'light')).toBeLessThan(1.5);
      expect(ratioOn(fill, 'fg', 'light')).toBeGreaterThanOrEqual(
        AA_TEXT_CONTRAST,
      );
      expect(pillInkFor(fill, 'light')).toEqual({
        text: 'var(--fg)',
        disc: 'var(--bg)',
      });
    },
  );

  it.each(PALEST)('Electric: %s keeps the drawn --bg', (fill) => {
    expect(ratioOn(fill, 'bg', 'electric')).toBeGreaterThanOrEqual(
      AA_TEXT_CONTRAST,
    );
    expect(pillInkFor(fill, 'electric')).toEqual({
      text: 'var(--bg)',
      disc: 'var(--fg)',
    });
  });

  // Every colour a stamp can take, on every theme, reaches AA with the chosen
  // ink, so the fallback ("whichever is higher") never ships below AA today.
  it('reaches AA for every venue and accent colour on every theme', () => {
    const fills = new Set<string>([
      ...Object.values(VENUE_GLYPHS).map((glyph) => glyph.to),
      ...STAMP_ACCENTS,
    ]);
    for (const theme of THEME_NAMES) {
      for (const fill of fills) {
        const token =
          pillInkFor(fill, theme).text === 'var(--bg)' ? 'bg' : 'fg';
        const ratio = contrastRatio(fill, THEMES[theme][token] ?? '');
        expect(ratio, `${fill} on ${theme}`).toBeGreaterThanOrEqual(
          AA_TEXT_CONTRAST,
        );
      }
    }
  });

  it('keeps the drawn --bg for a fill that is not a six-digit hex', () => {
    expect(pillInkFor('var(--signal)', 'light').text).toBe('var(--bg)');
  });
});
