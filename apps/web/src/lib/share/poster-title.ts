/**
 * Title fitting for the poster card.
 *
 * Satori gives us no way to measure text, so the poster cannot lay the title
 * out and then react to it — it has to pick a size up front. Without this, a
 * long artist name simply runs off the edge of the card: "Wunderhorse" at the
 * story ratio's locked 180px clipped to "WUNDERHO" on a real event, which is
 * both unreadable and unshippable.
 *
 * The estimate below is deliberately conservative. Guessing slightly small
 * costs a few points of type; guessing large costs a clipped artist name.
 */

/**
 * Mean advance width of an uppercase Inter 900 glyph at -0.06em tracking, as a
 * fraction of the font size. Measured off rendered posters rather than from the
 * font tables, so it already includes the negative tracking.
 */
const UPPERCASE_ADVANCE_RATIO = 0.66

/** Below this fraction of the locked size the title stops reading as display type. */
const MIN_SCALE = 0.45

/**
 * The largest font size at which the title's longest *word* still fits one
 * line, capped at the ratio's locked size.
 *
 * Only the longest word is constrained: the poster's title block wraps, so a
 * multi-word name is free to run onto a second line at full size. A single
 * unbreakable word is the only thing that can overflow.
 */
export const fitTitleSize = (
  title: string,
  baseSize: number,
  availableWidth: number,
): number => {
  const longestWord = title
    .split(/\s+/)
    .reduce(
      (longest, word) => (word.length > longest ? word.length : longest),
      0,
    )

  if (longestWord === 0) return baseSize

  const fitting = availableWidth / (longestWord * UPPERCASE_ADVANCE_RATIO)
  const floor = baseSize * MIN_SCALE

  // Floor, not round: rounding up can push the estimate back past the width it
  // was computed to respect, which is the whole failure this guards against.
  return Math.floor(Math.max(floor, Math.min(baseSize, fitting)))
}
