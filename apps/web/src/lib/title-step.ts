/**
 * Addendum 3 rule 2: a hero title wraps at spaces, and a single word that
 * can't fit steps down one size at a time (38, 30, 26) at the 320px floor.
 * It never ellipsises or breaks mid-word. The step is picked by how wide the
 * word sets, not by how many letters it has: "Illuminati" and "Wwwwwwwwww" are
 * the same length and not the same width. Calibrated on the boards:
 * "Corporation" holds 38, "Superorganism" drops to 30.
 *
 * The server cannot measure text, so the width is an estimate from per-glyph
 * advances of the heavy sans (em units), tuned so the two board words land
 * where the boards draw them.
 */
export const TITLE_STEPS = [38, 30, 26] as const;
export type TitleStep = (typeof TITLE_STEPS)[number];

const NARROW = new Set('ijl');
const THIN = new Set('ftr');
const WIDE = new Set('mw');
const PUNCT = new Set("'.,-");

/** Approximate advance of one glyph, in em. */
const FULL_WIDTH =
  /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const COMBINING = /\p{M}/u;

const glyphWidth = (ch: string): number => {
  // A combining mark rides on its base letter and adds no advance.
  if (COMBINING.test(ch)) return 0;
  // CJK glyphs are about a full em wide.
  if (FULL_WIDTH.test(ch)) return 1;
  if (NARROW.has(ch)) return 0.28;
  if (THIN.has(ch)) return 0.42;
  if (WIDE.has(ch)) return 0.92;
  if (PUNCT.has(ch)) return 0.3;
  if (ch === 'I') return 0.34;
  if (ch === 'M' || ch === 'W') return 0.95;
  if (ch !== ch.toLowerCase()) return 0.72;
  return 0.62;
};

const wordWidth = (word: string): number =>
  [...word.normalize('NFC')].reduce((sum, ch) => sum + glyphWidth(ch), 0);

// "Corporation" is the widest word the boards hold at 38; 30 holds a word up to
// 1.4 times that (the 26 step takes anything wider).
const FITS_38 = wordWidth('Corporation');
const FITS_30 = FITS_38 * 1.4;

export function titleStepPx(name: string): TitleStep {
  const widest = name
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, wordWidth(word)), 0);
  if (widest <= FITS_38) return TITLE_STEPS[0];
  if (widest <= FITS_30) return TITLE_STEPS[1];
  return TITLE_STEPS[2];
}
