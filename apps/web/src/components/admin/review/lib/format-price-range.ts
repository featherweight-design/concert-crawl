/**
 * Format a price range for display. Used by the contest review surfaces
 * (queue + entry card) to render `$40` or `$40–$60`.
 *
 * - When ceiling is null OR ceiling <= floor → `$floor`
 * - Otherwise → `$floor–$ceiling`
 * - Both values are parsed via `parseFloat` to tolerate Postgres decimal
 *   strings like "48.00". Integer values render without trailing ".00"
 *   via an explicit `Number.isInteger` branch.
 *
 * Extracted from duplicated implementations in PriceDisputesQueue.tsx
 * and AdminEntry.tsx (Copilot R7-2). Both call sites had identical bodies;
 * a tweak in one would have silently diverged from the other.
 */
export const formatPriceRange = (
  floor: string,
  ceiling: string | null,
): string => {
  const floorNum = parseFloat(floor)
  const formatNum = (num: number): string =>
    Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`
  if (ceiling === null) return formatNum(floorNum)
  const ceilingNum = parseFloat(ceiling)
  if (ceilingNum > floorNum)
    return `${formatNum(floorNum)}–${formatNum(ceilingNum)}`
  return formatNum(floorNum)
}
