/**
 * Rule 2's measure pass. Given the natural widths of the chips the budget
 * already approved, return how many of them actually fit the meta column.
 *
 * Whole chips drop. Slicing a chip mid-glyph reads as a bug rather than a
 * rule, and wrapping is what put a fifth line on the row this system exists
 * to flatten.
 */
export function fitChips(
  widths: readonly number[],
  available: number,
  gap: number,
): number {
  // A zero-width box means the element has not been laid out yet. Claiming
  // nothing fits would flash the row empty on first paint.
  if (available <= 0) return widths.length

  let used = 0
  for (let i = 0; i < widths.length; i++) {
    used += (widths[i] ?? 0) + (i > 0 ? gap : 0)
    // Sub-pixel layout rounding routinely puts a chip a fraction over a box
    // it visually fills exactly.
    if (used > available + 0.5) return i
  }
  return widths.length
}
