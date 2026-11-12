// The text colour for a pill filled with a venue's stamp colour.
//
// The stamp boards draw "Yes, going" as `--bg` text on the venue's hex, and
// every one of them is on a dark theme. On Light, `--bg` is near-white, so the
// pale venue colours drop to about 1.2:1. Rather than mixing a new colour, the
// pill keeps the venue hex and picks whichever of the theme's own `--bg` or
// `--fg` reads at WCAG AA (4.5:1) on it, preferring `--bg` as drawn.
//
// CSS cannot choose between two theme tokens by contrast at runtime
// (`contrast-color()` only returns black or white, and is not yet in every
// browser), so this reads the resolved tokens from `THEMES`.

import { THEMES, type ThemeName } from '@/theme/themes';

/** WCAG 2 AA for body-size text. */
export const AA_TEXT_CONTRAST = 4.5;

const channel = (srgb: number): number => {
  const unit = srgb / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a six-digit hex, or null for anything else. */
export const relativeLuminance = (hex: string): number | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return null;
  const num = parseInt(match[1], 16);
  return (
    0.2126 * channel((num >> 16) & 255) +
    0.7152 * channel((num >> 8) & 255) +
    0.0722 * channel(num & 255)
  );
};

/** WCAG contrast ratio between two six-digit hexes, or null if either is not one. */
export const contrastRatio = (one: string, two: string): number | null => {
  const lumOne = relativeLuminance(one);
  const lumTwo = relativeLuminance(two);
  if (lumOne === null || lumTwo === null) return null;
  return (Math.max(lumOne, lumTwo) + 0.05) / (Math.min(lumOne, lumTwo) + 0.05);
};

type InkToken = 'var(--bg)' | 'var(--fg)';

export interface PillInk {
  /** The label and the stamp check, in the pill. */
  text: InkToken;
  /** The disc behind the check: the token the text did not take, so it stays pale against dark ink and dark against pale ink. */
  disc: InkToken;
}

const BG_INK: PillInk = { text: 'var(--bg)', disc: 'var(--fg)' };
const FG_INK: PillInk = { text: 'var(--fg)', disc: 'var(--bg)' };

/**
 * The ink for a pill filled with `fill` on `theme`: `--bg` when it reaches AA
 * (as the boards draw it), else `--fg` when that does, else whichever is
 * higher. A fill that is not a six-digit hex keeps the drawn `--bg`.
 */
export const pillInkFor = (fill: string, theme: ThemeName): PillInk => {
  const tokens = THEMES[theme];
  const onBg = contrastRatio(fill, tokens.bg ?? '');
  const onFg = contrastRatio(fill, tokens.fg ?? '');
  if (onBg === null || onFg === null) return BG_INK;
  if (onBg >= AA_TEXT_CONTRAST) return BG_INK;
  if (onFg >= AA_TEXT_CONTRAST) return FG_INK;
  return onFg > onBg ? FG_INK : BG_INK;
};
