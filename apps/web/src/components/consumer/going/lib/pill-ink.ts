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

import { AA_TEXT_CONTRAST, contrastRatio } from '@/theme/contrast';
import { THEMES, type ThemeName } from '@/theme/themes';

// The maths moved to `@/theme/contrast` so `themes.ts` can derive tokens by
// contrast too; re-exported so existing imports keep working.
export {
  AA_TEXT_CONTRAST,
  contrastRatio,
  relativeLuminance,
} from '@/theme/contrast';

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
