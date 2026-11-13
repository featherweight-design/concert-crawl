/**
 * "X with Y": the venue's own wording for a headliner and its support.
 *
 * Red Rocks billed "Clipse with J.I.D.". The LLM extractor's cleaned `title`
 * came back "Clipse & J.I.D" and its headliners as ["Clipse", "J.I.D"], so the
 * calendar showed a co-headline the venue never printed. The prompt already
 * says the act after "with" supports; the model ignored it. These two guards
 * hold that rule in code, from the structure of the venue's title alone:
 *
 * - `keepWithJoiner` puts the venue's joiner back into a cleaned title that
 *   swapped it for "&", ",", "+", "/" or "and".
 * - `demoteActsAfterWith` moves a headliner the title bills after "with" into
 *   supporting, ahead of the openers already there.
 *
 * Both read only where a name sits relative to the joiner word, never the
 * shape of the name itself (#1343: no name-shape heuristics). A genuine
 * "X & Y" co-headline has no with-style joiner and is never touched.
 */

// A with-style joiner between two acts. "with" and "featuring" need a space
// after them ("without" is not a joiner); "w/", "feat." and "ft." may run
// straight into the next name. "special guest(s)" is the same billing.
const WITH_JOINER =
  /\s+(?:with(?:\s+special\s+guests?)?\s+|w\/\s*|featuring\s+|feat\.?\s+|feat\.|ft\.\s*|special\s+guests?\s+)/i;
const WITH_JOINER_GLOBAL = new RegExp(WITH_JOINER.source, 'gi');

// What the model writes in place of the venue's joiner.
const SUBSTITUTE_JOINER = /^(?:\s*&\s*|\s*,\s*|\s+\+\s+|\s+and\s+|\s+\/\s+)/i;

// Compare words without case or punctuation: "J.I.D." on the page is "J.I.D"
// in the cleaned title.
const fold = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const lastWord = (text: string): string => fold(text).split(' ').pop() ?? '';
const firstWord = (text: string): string => fold(text).split(' ')[0] ?? '';

/** True when a title bills acts with "with", "w/", "featuring" and the like. */
export function hasWithJoiner(title: string): boolean {
  return WITH_JOINER.test(title);
}

/**
 * The cleaned title with every with-style joiner the venue printed (in
 * `rawTitle`) restored where the model substituted "&", ",", "+", "/" or
 * "and" between the same two words. Anything the model cleaned around the
 * joiner (a stripped venue suffix, a dropped presenter) is left as it is.
 */
export function keepWithJoiner(title: string, rawTitle: string): string {
  let result = title;
  for (const match of rawTitle.matchAll(WITH_JOINER_GLOBAL)) {
    const before = lastWord(rawTitle.slice(0, match.index));
    const after = firstWord(rawTitle.slice(match.index + match[0].length));
    if (before === '' || after === '') continue;
    const joiner = match[0].trim();
    // Each candidate substitute in the cleaned title, checked against the two
    // words the venue's joiner sat between.
    for (let i = 1; i < result.length; i += 1) {
      const substitute = SUBSTITUTE_JOINER.exec(result.slice(i));
      if (substitute === null) continue;
      const head = result.slice(0, i);
      const tail = result.slice(i + substitute[0].length);
      if (lastWord(head) !== before || firstWord(tail) !== after) continue;
      // The model may have recased the whole title; follow its case for a
      // word joiner so "Clipse & J.I.D" does not become "Clipse WITH J.I.D".
      const written =
        /^[a-z\s]+$/i.test(joiner) && head !== head.toUpperCase()
          ? joiner.toLowerCase()
          : joiner;
      result = `${head.trimEnd()} ${written} ${tail.trimStart()}`;
      break;
    }
  }
  return result;
}

const appearsIn = (name: string, text: string): boolean => {
  const key = fold(name);
  return key !== '' && ` ${fold(text)} `.includes(` ${key} `);
};

/**
 * Moves every headliner the title bills after its first with-style joiner into
 * supporting, in billing order and ahead of the openers already listed.
 *
 * Only when the first headliner sits BEFORE the joiner: "An Evening with X &
 * Y" puts the whole bill after "with", and there the joiner introduces the
 * headliners rather than their support. A name that also appears before the
 * joiner stays a headliner. The first headliner is never moved, so a bill
 * always keeps one. A bill with nothing to move comes back as it was given.
 */
export function demoteActsAfterWith(
  title: string,
  headliners: string[],
  supportingArtists: string[],
): { headliners: string[]; supportingArtists: string[] } {
  const match = WITH_JOINER.exec(title);
  if (match === null) return { headliners, supportingArtists };
  const front = title.slice(0, match.index);
  const back = title.slice(match.index + match[0].length);
  // A lone flattened name ("Clipse & J.I.D") is never split here: splitting a
  // string on punctuation is the adjudicator's call (CO_BILLING_JOINERS), and
  // its split headliners pass through this function afterwards.
  const [lead, ...rest] = headliners;
  if (lead === undefined || rest.length === 0) {
    return { headliners, supportingArtists };
  }
  if (!appearsIn(lead, front) || appearsIn(lead, back)) {
    return { headliners, supportingArtists };
  }
  const kept = [lead];
  const demoted: string[] = [];
  for (const name of rest) {
    if (appearsIn(name, back) && !appearsIn(name, front)) demoted.push(name);
    else kept.push(name);
  }
  if (demoted.length === 0) return { headliners, supportingArtists };
  const demotedKeys = new Set(demoted.map(fold));
  return {
    headliners: kept,
    supportingArtists: [
      ...demoted,
      ...supportingArtists.filter((name) => !demotedKeys.has(fold(name))),
    ],
  };
}
