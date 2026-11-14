/**
 * Inter 900's advance widths, in em, for printable ASCII (U+0020 to U+007E in
 * order), read from the hmtx table of `public/fonts/share/inter-900.ttf`
 * (2048 units per em). Satori cannot measure text, so the share card's name
 * fitting sums these instead of guessing an average. Kerning is left out: in
 * Inter it only tightens pairs, so the sum errs wide, never narrow.
 */
const ASCII_ADVANCES = [
  0.199, 0.381, 0.625, 0.662, 0.666, 1.044, 0.695, 0.372, 0.388, 0.388, 0.608,
  0.693, 0.373, 0.475, 0.373, 0.412, 0.711, 0.452, 0.646, 0.669, 0.702, 0.646,
  0.675, 0.595, 0.679, 0.675, 0.373, 0.378, 0.693, 0.693, 0.693, 0.601, 1.059,
  0.795, 0.668, 0.748, 0.723, 0.613, 0.584, 0.754, 0.75, 0.291, 0.596, 0.759,
  0.565, 0.956, 0.77, 0.775, 0.656, 0.787, 0.668, 0.666, 0.687, 0.722, 0.795,
  1.082, 0.786, 0.775, 0.694, 0.388, 0.412, 0.388, 0.5, 0.493, 0.401, 0.597,
  0.646, 0.603, 0.646, 0.606, 0.422, 0.647, 0.649, 0.296, 0.296, 0.606, 0.296,
  0.943, 0.649, 0.625, 0.646, 0.646, 0.434, 0.588, 0.399, 0.649, 0.632, 0.877,
  0.609, 0.636, 0.59, 0.505, 0.405, 0.505, 0.693,
];

/** `…` (U+2026) in Inter 900. */
export const INTER_900_ELLIPSIS = 1.119;

/**
 * Anything outside ASCII whose base letter is not ASCII either (CJK, emoji, a
 * flag): as wide as Inter's widest letters, so the estimate stays safe.
 */
const UNKNOWN_ADVANCE = 1.1;

/**
 * One grapheme's advance in em. An accented Latin letter is measured as its
 * base letter (`é` as `e`), which Inter draws at the same width.
 */
export const inter900Advance = (grapheme: string): number => {
  const decomposed = grapheme.normalize('NFD');
  const code = decomposed.codePointAt(0) ?? 0;
  const marksOnly = /^\p{M}*$/u.test(decomposed.slice(1));
  const advance =
    code >= 32 && code < 127 && marksOnly
      ? ASCII_ADVANCES[code - 32]
      : undefined;
  return advance ?? UNKNOWN_ADVANCE;
};
