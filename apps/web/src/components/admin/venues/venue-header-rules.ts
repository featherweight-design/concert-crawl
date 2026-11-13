import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueHeader;

/** What the header's rules read from the venue. */
export type HeaderVenue = Pick<
  VenueWithCrawlHealth,
  'active' | 'robotsTxtAllowed' | 'crawlPausedAt' | 'neighborhood'
> & { deleteBlockers?: VenueWithCrawlHealth['deleteBlockers'] };

/** Why Re-crawl is off, or null when it can run (`A3/03/re-crawl-states`). */
export type RecrawlOff = keyof typeof COPY.recrawlOff;

/**
 * The API refuses all three (`queueVenueCrawl`): a hidden venue (400), a
 * robots.txt disallow (409, never overridden) and a paused crawl (409).
 */
export const recrawlOff = (venue: HeaderVenue): RecrawlOff | null => {
  if (!venue.active) return 'hidden';
  if (venue.robotsTxtAllowed === false) return 'robots';
  // Paused and auto-paused alike (orchestrator ruling): resume first.
  if (venue.crawlPausedAt !== null) return 'paused';
  return null;
};

/** View on site is hidden for hidden (and, once 3e lands, draft) venues. */
export const showsViewOnSite = (venue: HeaderVenue): boolean => venue.active;

/**
 * The line beside the chips: "Central Platte Valley · 235 upcoming", or why
 * Re-crawl is off. The phone keeps the neighbourhood under the name instead
 * (`A3/03/venue-overview-m`), so its line is only the reason.
 */
export const headerLine = (venue: HeaderVenue, isPhone: boolean): string => {
  const off = recrawlOff(venue);
  if (off !== null) return COPY.recrawlOff[off];
  if (isPhone) return '';
  const shows = venue.deleteBlockers?.upcomingShows ?? null;
  return [venue.neighborhood, shows === null ? null : COPY.upcoming(shows)]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
};
