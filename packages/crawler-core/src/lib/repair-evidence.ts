// What the artist repair is allowed to write. The repair re-derives a whole
// bill from a stored row, and the ladder has quirks: it names a recurring series
// as an act, keeps only the first of "A and B", stores a raw title as an artist.
// A repair that writes every difference turns each quirk into a write, so it
// writes only what it can evidence, and leaves the rest for a human:
//
//   split     a stored joined name ("A & B") the evidence ruled two acts, both
//             parts headliners, every stored act otherwise kept, nothing else
//             added (a part never lands in supporting)
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
  | 'would-demote-split-part'
  | 'model-cover-verdict-only'
  | 'would-add-an-artist'
  | 'nothing-evidenced';

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

  // Stored joined names whose parts are all HEADLINERS on the new bill: split.
  // A stored headliner's parts stay headliners; a part the ladder moved down to
  // supporting ("Concrete & Jerry Garcia" -> Concrete, with Jerry Garcia
  // supporting) is a billing the stored row does not evidence, so it is not a
  // split and the row is left alone.
  const splitNames = stored.headliners.filter((name) => {
    const parts = partsOf(name);
    return (
      parts.length > 0 &&
      !nextAll.has(nameKey(name)) &&
      parts.every((part) => nextH.has(nameKey(part)))
    );
  });
  const splitParts = new Set(splitNames.flatMap(partsOf).map(nameKey));
  // A joined name the STORED bill already has, kept whole on the new bill,
  // accounts for its parts being listed separately beside it.
  const keptWholeParts = new Set(
    next.headliners
      .filter((name) => partsOf(name).length > 0 && storedH.has(nameKey(name)))
      .flatMap(partsOf)
      .map(nameKey),
  );

  // A stored headliner that is only on the new bill as supporting was demoted,
  // which is a change of billing the repair cannot evidence.
  for (const key of storedH) {
    if (nextH.has(key)) continue;
    if (keptWholeParts.has(key)) continue;
    if (splitNames.some((name) => nameKey(name) === key)) continue;
    // A stored joined name whose parts are all on the new bill, but not all as
    // headliners, was split and demoted: say so rather than "dropped".
    const demoted = stored.headliners.some((name) => {
      const parts = partsOf(name);
      return (
        nameKey(name) === key &&
        parts.length > 0 &&
        parts.every((part) => nextAll.has(nameKey(part)))
      );
    });
    return {
      write: false,
      reason: demoted
        ? 'would-demote-split-part'
        : 'would-drop-stored-headliner',
    };
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
    // A split part the ladder lists as headliner AND supporting is one act.
    if (storedS.has(key) || (splitParts.has(key) && nextH.has(key))) continue;
    return { write: false, reason: 'would-add-an-artist' };
  }
  if (splitNames.length > 0) return { write: true, kind: 'split' };
  // Not a split: it is a dedupe only if something was actually removed. A
  // respelling, a reorder or a role swap that every check above lets through is
  // not an evidenced change.
  const storedCount =
    stored.headliners.length + (stored.supporting ?? []).length;
  const nextCount = next.headliners.length + next.supporting.length;
  // "Telly & Friends" -> "Telly" is the ladder's own identity rule (nameKey
  // drops the company tail), the one respelling the repair does write.
  const tailDropped = stored.headliners.some(
    (name) =>
      nameKey(name) !== name.trim().toLowerCase() &&
      next.headliners.some((other) => nameKey(other) === nameKey(name)),
  );
  return nextCount < storedCount || tailDropped
    ? { write: true, kind: 'dedupe' }
    : { write: false, reason: 'nothing-evidenced' };
}
