import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { identityFromParts } from '@/components/consumer/search/artist-line';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

type PreviewFields = Pick<
  ArtistSearchAllResult,
  'type' | 'area' | 'disambiguation'
>;

/** MusicBrainz's kind of act in a fan's words, or null when it has none. */
export const typeLabel = (type: PreviewFields['type']): string | null => {
  return type ? CONSUMER_COPY.search.artistTypeLabel[type] : null;
};

/**
 * The line under the name: the disambiguation when MusicBrainz has one, else
 * the type, then the area. Each part is dropped when missing; null when none
 * is left, so the line itself is not drawn.
 */
export const identityLine = (artist: PreviewFields): string | null =>
  identityFromParts({
    typeWord: typeLabel(artist.type),
    disambiguation: artist.disambiguation?.trim() || null,
    area: artist.area?.trim() || null,
  });
