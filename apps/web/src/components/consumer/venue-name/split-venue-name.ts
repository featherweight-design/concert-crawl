/**
 * Venue nouns that name the kind of room, not the venue. The B+ boards leave
 * these plain and gradient the distinctive words ("The Church Nightclub",
 * "Red Rocks Amphitheatre"). The addendum-3 ruling is not in the repo, so this
 * is a small explicit list.
 */
const GENERIC_VENUE_NOUNS: ReadonlySet<string> = new Set([
  'amphitheatre',
  'amphitheater',
  'theater',
  'theatre',
  'ballroom',
  'hall',
  'auditorium',
  'lounge',
  'nightclub',
  'club',
  'pavilion',
  'arena',
  'box',
  'garden',
  'gardens',
  'room',
  'stage',
  'center',
  'centre',
  'music',
  'saloon',
  'bar',
  'tavern',
  'stadium',
  'house',
]);

const ARTICLES: ReadonlySet<string> = new Set(['the']);

export interface VenueNameParts {
  before: string;
  highlight: string;
  after: string;
}

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function isDistinctive(word: string): boolean {
  const key = normalise(word);
  return key !== '' && !GENERIC_VENUE_NOUNS.has(key) && !ARTICLES.has(key);
}

/**
 * Picks the run of distinctive words that ends at the last word which is not
 * a generic venue noun or a leading article. "Red Rocks Amphitheatre" gives
 * "Red Rocks"; "The Church Nightclub" gives "Church". A name with no
 * distinctive word (all generic) gives null and renders plain.
 */
export function splitVenueName(name: string): VenueNameParts | null {
  const words = [...name.matchAll(/\S+/g)].map((match) => ({
    text: match[0],
    start: match.index ?? 0,
  }));
  let last = -1;
  for (let i = words.length - 1; i >= 0; i -= 1) {
    if (isDistinctive(words[i]!.text)) {
      last = i;
      break;
    }
  }
  if (last === -1) return null;
  let first = last;
  while (first > 0 && isDistinctive(words[first - 1]!.text)) first -= 1;
  const startIndex = words[first]!.start;
  const endIndex = words[last]!.start + words[last]!.text.length;
  return {
    before: name.slice(0, startIndex),
    highlight: name.slice(startIndex, endIndex),
    after: name.slice(endIndex),
  };
}
