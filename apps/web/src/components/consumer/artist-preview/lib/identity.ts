import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { ARTIST_PREVIEW_COPY } from '../definitions/copy';

type PreviewFields = Pick<
  ArtistSearchAllResult,
  'type' | 'area' | 'disambiguation'
>;

/** MusicBrainz's kind of act in a fan's words, or null when it has none. */
export const typeLabel = (type: PreviewFields['type']): string | null => {
  if (type === 'person') return ARTIST_PREVIEW_COPY.typePerson;
  if (type === 'group') return ARTIST_PREVIEW_COPY.typeGroup;
  return null;
};

/**
 * The line under the name: the disambiguation when MusicBrainz has one, else
 * the type, then the area. Each part is dropped when missing; null when none
 * is left, so the line itself is not drawn.
 */
export const identityLine = (artist: PreviewFields): string | null => {
  const lead = artist.disambiguation?.trim() || typeLabel(artist.type);
  const area = artist.area?.trim() || null;
  const parts = [lead, area].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
};
