/**
 * Crawlers sometimes put a bare status word ("Canceled") in the description.
 * The status already shows in the stage, so such a description carries no
 * About content and the block is hidden (B+ board `more-st-ev_canc_m`).
 */
const STATUS_ONLY = new Set([
  'cancelled',
  'canceled',
  'postponed',
  'sold out',
  'rescheduled',
]);

export const aboutDescription = (
  description: string | null | undefined,
): string | null => {
  if (!description) return null;
  const trimmed = description.trim();
  if (trimmed === '' || STATUS_ONLY.has(trimmed.toLowerCase())) return null;
  return description;
};
