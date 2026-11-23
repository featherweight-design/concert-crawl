import type { ArtistSearchAllResult } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { formatDayLabel } from './ResultParts';

const copy = CONSUMER_COPY.search;

/** What an artist row's second line says (addendum 12, `01/search-spec`). */
export type ArtistLine =
  | { kind: 'shows'; count: number; text: string }
  | { kind: 'plain'; text: string };

/** The act's identity text from MusicBrainz, or null when it has none. */
const identityLine = (artist: ArtistSearchAllResult): string | null => {
  const typeWord = artist.type ? copy.artistTypeLabel[artist.type] : null;
  const lead = artist.disambiguation ?? typeWord;
  const parts = [lead, artist.area].filter(
    (part): part is string => part !== null && part !== '',
  );
  return parts.length > 0 ? parts.join(' · ') : null;
};

const normalise = (name: string): string => name.trim().toLowerCase();

/**
 * The names that more than one listed row carries. Computed over what is
 * listed, not the database: two Clips on screen both say which Clip they are.
 */
export const sharedNames = (rows: ArtistSearchAllResult[]): Set<string> => {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const row of rows) {
    const key = normalise(row.name);
    if (seen.has(key)) shared.add(key);
    seen.add(key);
  }
  return shared;
};

export const isSharedName = (
  shared: Set<string>,
  artist: ArtistSearchAllResult,
): boolean => shared.has(normalise(artist.name));

/**
 * Kind 1 (has upcoming shows): the N SHOWS marker, the next date, the venue.
 * Kind 2 (ours, nothing booked): "No Denver dates yet", or "No upcoming Denver
 * dates" for an act that has played here. Kind 3 (MusicBrainz only): its
 * identity line. A shared name swaps the venue, or the whole line when there
 * are no dates, for the identity line when MusicBrainz has one.
 */
export const artistLine = (
  artist: ArtistSearchAllResult,
  shared: boolean,
): ArtistLine => {
  const identity = identityLine(artist);
  if (artist.slug === null) {
    return { kind: 'plain', text: identity ?? copy.artistFallbackLine };
  }
  const next = artist.nextShow;
  if (artist.upcomingShowCount > 0 && next !== null) {
    const venueOrIdentity = shared && identity !== null ? identity : next.venue;
    return {
      kind: 'shows',
      count: artist.upcomingShowCount,
      text: copy.nextShowLine(formatDayLabel(next.iso), venueOrIdentity),
    };
  }
  if (shared && identity !== null) return { kind: 'plain', text: identity };
  return {
    kind: 'plain',
    text: artist.hasShows ? copy.noUpcomingDates : copy.noDatesYet,
  };
};
