import type { VenuePublic } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { posterVenueLine, posterVenues } from './poster-rule';

/** What the sheet needs to name the venues: a count and a fitted line. */
export interface PosterVenueData {
  venueCount: number;
  venueNames: string[];
  moreVenues: boolean;
}

/**
 * The crawled venues the poster counts and names, from the public list (active
 * venues only). If it fails, the sheet still prints: no venue line, and a sub
 * without a count.
 */
export async function loadPosterVenues(
  token: string,
): Promise<PosterVenueData> {
  const venues = posterVenues(
    await apiClient
      .get<VenuePublic[]>('/v1/venues', token)
      .catch((): VenuePublic[] => []),
  );
  const line = posterVenueLine(venues);
  return {
    venueCount: venues.length,
    venueNames: line.names,
    moreVenues: line.more,
  };
}
