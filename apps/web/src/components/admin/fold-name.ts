/**
 * Folds what a keyboard or autocorrect changes without meaning to: Unicode
 * forms (NFKC), curly quotes to straight, runs of whitespace, and case. The
 * type-to-confirm deletes (a venue's name, a show's title) compare through it.
 */
export const foldName = (text: string): string =>
  text
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
