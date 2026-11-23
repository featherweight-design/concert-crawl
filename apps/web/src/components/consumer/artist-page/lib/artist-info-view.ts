import type { ArtistInfoFacts } from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { identityFromParts } from '@/components/consumer/search/artist-line';

import { ARTIST_COPY } from '../definitions/copy';
import type { AboutFact } from '../AboutBlock';

const search = CONSUMER_COPY.search;

/**
 * MusicBrainz types in the app's words (addendum 12): Person "Solo artist",
 * Group "Band", and Orchestra, Choir, Character and Other all "Artist".
 */
export const typeWord = (type: string | null): string | null => {
  if (!type) return null;
  const key = type.toLowerCase();
  return key === 'person' || key === 'group'
    ? search.artistTypeLabel[key]
    : search.artistFallbackLine;
};

/**
 * The one mono line under the name where a booked act's genre chips sit. The
 * same order as the search row's second line (disambiguation or type, then
 * area), with "Artist" when MusicBrainz has
 * a row but nothing to say. Null when there are no facts at all.
 */
export const identityLineFor = (
  facts: ArtistInfoFacts | null,
): string | null => {
  if (!facts) return null;
  return (
    identityFromParts({
      typeWord: typeWord(facts.type),
      disambiguation: facts.disambiguation,
      area: facts.area,
    }) ?? search.artistFallbackLine
  );
};

/** The About card's rows. A fact we do not hold has no row. */
export const aboutFactsFor = (facts: ArtistInfoFacts | null): AboutFact[] => {
  if (!facts) return [];
  const word = typeWord(facts.type);
  return [
    ...(word ? [{ label: ARTIST_COPY.about.typeLabel, value: word }] : []),
    ...(facts.area
      ? [{ label: ARTIST_COPY.about.fromLabel, value: facts.area }]
      : []),
  ];
};
