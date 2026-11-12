/**
 * Addendum 3 rule 2: a hero title wraps at spaces, and a single word that
 * can't fit steps down one size at a time (38, 30, 26) at the 320px floor.
 * It never ellipsises or breaks mid-word. Calibrated on the boards:
 * "Corporation" (11 letters) holds 38, "Superorganism" (13) drops to 30.
 */
export const TITLE_STEPS = [38, 30, 26] as const;
export type TitleStep = (typeof TITLE_STEPS)[number];

const FITS_38 = 11;
const FITS_30 = 14;

export function titleStepPx(name: string): TitleStep {
  const longest = name
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);
  if (longest <= FITS_38) return TITLE_STEPS[0];
  if (longest <= FITS_30) return TITLE_STEPS[1];
  return TITLE_STEPS[2];
}
