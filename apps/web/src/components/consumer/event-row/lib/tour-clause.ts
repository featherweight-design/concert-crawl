/**
 * Line 1's one degradation step — the tour clause.
 *
 * The clause renders inline after the headliner and drops **whole** when the
 * line cannot hold both. There is no ellipsis and no truncated fragment: a
 * half-rendered tour name reads as a bug rather than as a rule, and the
 * headliner never gives up width to make room for one.
 *
 * The decision is arithmetic on measured natural widths — the same shape as
 * `fitChips` and `chooseLevel`, and for the same reason: the DOM wiring is
 * then only responsible for producing three numbers, and the rule itself is
 * testable without a layout engine.
 */

/**
 * Does the headliner's natural width plus the gap plus the clause fit the
 * title column?
 *
 * `titleWidth` is the headliner's *natural* width — what it would occupy if it
 * never truncated. Measuring the natural width rather than the rendered one is
 * what guarantees the headliner is never clipped to buy the clause a slot: a
 * headliner already too wide for the column on its own reports a width larger
 * than `available`, so the clause is refused before it can compete.
 */
export function tourClauseFits(
  titleWidth: number,
  clauseWidth: number,
  available: number,
  gap: number,
): boolean {
  // A zero-width box is an unlaid-out column, not a 0px one. Claiming the
  // clause does not fit would flash it out of every row on first paint, so the
  // pre-layout answer is the optimistic one and the observer corrects it.
  if (available <= 0) return true
  // Sub-pixel layout rounding routinely puts a line a fraction over a box it
  // visually fills exactly.
  return titleWidth + gap + clauseWidth <= available + 0.5
}
