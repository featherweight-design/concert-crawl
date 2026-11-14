/**
 * Venue nouns that name the kind of room, not the venue. The B+ boards leave
 * these plain and gradient the distinctive words ("The Church Nightclub",
 * "Red Rocks Amphitheatre"). The addendum-3 ruling names Theatre, Theater,
 * Hall, Club, Nightclub, Ballroom, Lounge, Pavilion, Amphitheatre, Arena and
 * Room, and nothing else: a wider list picked the wrong word ("Summit Music
 * Hall" is "Music" under the ruling). "Amphitheater" is the US spelling of the
 * ruled "Amphitheatre". "box" is not here: "The Black Box" gradients "Box".
 */
const GENERIC_VENUE_NOUNS: ReadonlySet<string> = new Set([
  'amphitheatre',
  'amphitheater',
  'theater',
  'theatre',
  'ballroom',
  'hall',
  'lounge',
  'nightclub',
  'club',
  'pavilion',
  'arena',
  'room',
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
 * Picks the last word that is not a generic venue noun or a leading article
 * (addendum-3 B11 "Name gradient"). "Red Rocks Amphitheatre" gives "Rocks";
 * "The Black Box" gives "Box"; "The Church Nightclub" gives "Church"; a
 * one-word name takes it whole. A name with no distinctive word (all generic)
 * gives null and renders plain.
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
  const startIndex = words[last]!.start;
  const endIndex = words[last]!.start + words[last]!.text.length;
  return {
    before: name.slice(0, startIndex),
    highlight: name.slice(startIndex, endIndex),
    after: name.slice(endIndex),
  };
}
