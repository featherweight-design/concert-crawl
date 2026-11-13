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

import { normalizeArtistName } from '@concert-crawl/types';

// A with-style joiner between two acts. "with" and "featuring" need a space
// after them ("without" is not a joiner); "w/", "feat." and "ft." may run
// straight into the next name. "special guest(s)" is the same billing.
const WITH_JOINER =
  /\s+(?:with(?:\s+special\s+guests?)?\s+|w\/\s*|featuring\s+|feat\.?\s+|feat\.|ft\.\s*|special\s+guests?\s+)/gi;

// What the model writes in place of the venue's joiner.
const SUBSTITUTE_JOINER = /\s*&\s*|\s*,\s*|\s+\+\s+|\s+and\s+|\s+\/\s+/gi;

// Compare words the way artist names are compared everywhere else (case and
// diacritics folded by the shared normalizer), and without punctuation:
// "J.I.D." on the page is "J.I.D" in the cleaned title.
const fold = (text: string): string =>
  normalizeArtistName(text)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const lastWord = (text: string): string => fold(text).split(' ').pop() ?? '';
const firstWord = (text: string): string => fold(text).split(' ')[0] ?? '';

// Every with-style joiner in a title, as the text either side of it.
const withSplits = (title: string): { front: string; back: string }[] =>
  [...title.matchAll(WITH_JOINER)].map((match) => ({
    front: title.slice(0, match.index),
    back: title.slice(match.index + match[0].length),
  }));

/** True when a title bills acts with "with", "w/", "featuring" and the like. */
export function hasWithJoiner(title: string): boolean {
  return withSplits(title).length > 0;
}

// The model may have recased the whole title: write the joiner in the case of
// the words before it, so neither "Clipse WITH J.I.D" nor "CLIPSE with J.I.D".
const inCaseOf = (head: string, joiner: string): string =>
  head === head.toUpperCase() && head !== head.toLowerCase()
    ? joiner.toUpperCase()
    : joiner.toLowerCase();

/**
 * The cleaned title with every with-style joiner the venue printed (in
 * `rawTitle`) restored where the model substituted "&", ",", "+", "/" or
 * "and" between the same two words. Anything the model cleaned around the
 * joiner (a stripped venue suffix, a dropped presenter) is left as it is.
 */
export function keepWithJoiner(title: string, rawTitle: string): string {
  let result = title;
  for (const { front, back } of withSplits(rawTitle)) {
    const before = lastWord(front);
    const after = firstWord(back);
    if (before === '' || after === '') continue;
    const joiner = rawTitle
      .slice(front.length, rawTitle.length - back.length)
      .trim();
    // The substitute in the cleaned title that sits between the same two words.
    const substitute = [...result.matchAll(SUBSTITUTE_JOINER)].find(
      (match) =>
        lastWord(result.slice(0, match.index)) === before &&
        firstWord(result.slice(match.index + match[0].length)) === after,
    );
    if (substitute === undefined) continue;
    const head = result.slice(0, substitute.index).trimEnd();
    const tail = result.slice(substitute.index + substitute[0].length);
    result = `${head} ${inCaseOf(head, joiner)} ${tail.trimStart()}`;
  }
  return result;
}

const appearsIn = (name: string, text: string): boolean => {
  const key = fold(name);
  return key !== '' && ` ${fold(text)} `.includes(` ${key} `);
};

/**
 * Moves every headliner the title bills after a with-style joiner into
 * supporting, in billing order and ahead of the openers already listed.
 *
 * The joiner that counts is the first one with the lead headliner wholly
 * before it: "Sleeping With Sirens with Memphis May Fire" splits at the
 * second "with", since the first sits inside the lead's own name. With no
 * such joiner ("An Evening with X & Y", where "with" introduces the
 * headliners) nothing moves. A name that also appears before the joiner stays
 * a headliner. The first headliner is never moved, so a bill always keeps one.
 * A bill with nothing to move comes back as it was given.
 */
export function demoteActsAfterWith(
  title: string,
  headliners: string[],
  supportingArtists: string[],
): { headliners: string[]; supportingArtists: string[] } {
  // A lone flattened name ("Clipse & J.I.D") is never split here: splitting a
  // string on punctuation is the adjudicator's call (CO_BILLING_JOINERS), and
  // its split headliners pass through this function afterwards.
  const [lead, ...rest] = headliners;
  if (lead === undefined || rest.length === 0) {
    return { headliners, supportingArtists };
  }
  const split = withSplits(title).find(
    ({ front, back }) => appearsIn(lead, front) && !appearsIn(lead, back),
  );
  if (split === undefined) return { headliners, supportingArtists };
  const kept = [lead];
  const demoted: string[] = [];
  for (const name of rest) {
    if (appearsIn(name, split.back) && !appearsIn(name, split.front)) {
      demoted.push(name);
    } else {
      kept.push(name);
    }
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
