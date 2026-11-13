import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueHeader;

/** What the header's rules read from the venue. */
export type HeaderVenue = Pick<
  VenueWithCrawlHealth,
  | 'active'
  | 'verified'
  | 'robotsTxtAllowed'
  | 'crawlPausedAt'
  | 'neighborhood'
  | 'slug'
> & {
  deleteBlockers?: VenueWithCrawlHealth['deleteBlockers'];
  removedAt?: VenueWithCrawlHealth['removedAt'];
};

/** Off the site: hidden, or taken down (`removedAt`) whatever `active` says. */
const offSite = (venue: HeaderVenue): boolean =>
  !venue.active || (venue.removedAt ?? null) !== null;

/** Why Re-crawl is off, or null when it can run (`A3/03/re-crawl-states`). */
export type RecrawlOff = keyof typeof COPY.recrawlOff;

/**
 * The API refuses all four (`queueVenueCrawl`): a hidden or unverified venue
 * (400), a robots.txt disallow (409, never overridden) and a paused crawl
 * (409).
 */
export const recrawlOff = (venue: HeaderVenue): RecrawlOff | null => {
  // Taken down is never crawled again, so it never says "Show it on the site":
  // the API refuses Show on it too (409 venue_removed).
  if ((venue.removedAt ?? null) !== null) return 'removed';
  if (offSite(venue)) return 'hidden';
  if (!venue.verified) return 'unverified';
  if (venue.robotsTxtAllowed === false) return 'robots';
  // Paused and auto-paused alike (orchestrator ruling): resume first.
  if (venue.crawlPausedAt !== null) return 'paused';
  return null;
};

/**
 * View on site opens our public venue page, not the venue's own website: the
 * handoff hides it for hidden (and, once 3e lands, draft) venues, which only
 * makes sense of a page we publish. Null when there is no page to open.
 */
export const viewOnSiteHref = (venue: HeaderVenue): string | null =>
  offSite(venue) ? null : `/venues/${encodeURIComponent(venue.slug)}`;

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
