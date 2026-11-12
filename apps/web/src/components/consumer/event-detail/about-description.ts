/**
 * Crawlers sometimes put a bare status word ("Canceled") in the description.
 * When that word restates the event's own status, the stage already shows it,
 * so the About block is hidden (B+ board `more-st-ev_canc_m`). A status word
 * that disagrees with the status field, or anything else, is kept: it may be
 * the only place that information appears.
 */
const STATUS_WORDS: Record<string, string> = {
  cancelled: 'cancelled',
  canceled: 'cancelled',
  postponed: 'postponed',
};

const normalise = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}]+$/u, '')
    .replace(/[-\s]+/g, ' ');

export const aboutDescription = (
  description: string | null | undefined,
  status: string,
): string | null => {
  if (!description) return null;
  const word = normalise(description);
  if (word === '') return null;
  if (STATUS_WORDS[word] === status) return null;
  return description;
};
