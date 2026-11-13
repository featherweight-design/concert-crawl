// What the artist repair is allowed to write. The repair re-derives a whole
// bill from a stored row, and the ladder has quirks: it names a recurring series
// as an act, keeps only the first of "A and B", stores a raw title as an artist.
// A repair that writes every difference turns each quirk into a write, so it
// writes only what it can evidence, and leaves the rest for a human:
//
//   split     a stored joined name ("A & B") the evidence ruled two acts, every
//             stored act otherwise kept, nothing else added
//   tribute   a cover or tribute night, bill cleared (the word rule)
//   dedupe    the same bill with a repeat removed, or a joined name beside its
//             own parts reduced to the ruled form
//
// Anything else is NOT written: a stored headliner would disappear, an artist
// would appear that nothing stored named, or there is no stored bill to compare
// with (the nightly crawl derives those). Adding artists is the crawl's job.
// Names are compared by `nameKey`; nothing here looks at the shape of a name
// (#1343), only at what the row already says.

import { nameKey } from './derive-artists.js';
import { partsOf } from './joined-names.js';

export type SkipReason =
  | 'stored-bill-unknown'
  | 'would-drop-stored-headliner'
  | 'would-drop-stored-supporting'
  | 'would-add-an-artist';

export type BillVerdict =
  | { write: true; kind: 'split' | 'tribute' | 'dedupe' }
  | { write: false; reason: SkipReason };

interface Bill {
  headliners: readonly string[] | null;
  supporting: readonly string[] | null;
}

const keysOf = (names: readonly string[]): Set<string> =>
  new Set(names.map(nameKey));

export function classifyBillChange(input: {
  stored: Bill;
  next: { headliners: readonly string[]; supporting: readonly string[] };
  /** The title settled as a cover, tribute or play-an-album night. */
  tribute: boolean;
}): BillVerdict {
  const { stored, next } = input;
  if (input.tribute) return { write: true, kind: 'tribute' };
  if (stored.headliners === null) {
    return { write: false, reason: 'stored-bill-unknown' };
  }

  const storedH = keysOf(stored.headliners);
  const storedS = keysOf(stored.supporting ?? []);
  const nextH = keysOf(next.headliners);
  const nextS = keysOf(next.supporting);
  const nextAll = new Set([...nextH, ...nextS]);

  // Stored joined names whose parts are all on the new bill: split.
  const splitNames = stored.headliners.filter((name) => {
    const parts = partsOf(name);
    return (
      parts.length > 0 &&
      !nextAll.has(nameKey(name)) &&
      parts.every((part) => nextAll.has(nameKey(part)))
    );
  });
  const splitParts = new Set(splitNames.flatMap(partsOf).map(nameKey));
  // A joined name kept whole on the new bill accounts for its parts' absence.
  const keptWholeParts = new Set(
    next.headliners
      .filter((name) => partsOf(name).length > 0)
      .flatMap(partsOf)
      .map(nameKey),
  );

  for (const key of storedH) {
    if (nextH.has(key) || nextS.has(key)) continue;
    if (keptWholeParts.has(key)) continue;
    if (splitNames.some((name) => nameKey(name) === key)) continue;
    return { write: false, reason: 'would-drop-stored-headliner' };
  }
  for (const key of storedS) {
    if (nextAll.has(key) || keptWholeParts.has(key)) continue;
    return { write: false, reason: 'would-drop-stored-supporting' };
  }
  for (const key of nextH) {
    if (storedH.has(key) || splitParts.has(key)) continue;
    return { write: false, reason: 'would-add-an-artist' };
  }
  for (const key of nextS) {
    if (storedS.has(key) || storedH.has(key) || splitParts.has(key)) continue;
    return { write: false, reason: 'would-add-an-artist' };
  }
  return { write: true, kind: splitNames.length > 0 ? 'split' : 'dedupe' };
}
