import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { z } from 'zod';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { shortTime } from './overview/overview-rules';

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

const startedAtSchema = z.iso.datetime({ offset: true });

/**
 * When a running re-crawl started: the trigger's `updatedAt` once it reads
 * `processing`, which the crawler stamps as it claims the trigger. Null for
 * any other status or a time that won't parse.
 */
export const runningSince = (trigger: {
  status: string;
  updatedAt: unknown;
}): string | null => {
  if (trigger.status !== 'processing') return null;
  const parsed = startedAtSchema.safeParse(trigger.updatedAt);
  return parsed.success ? parsed.data : null;
};

/**
 * The line beside the chips: "Central Platte Valley · 235 upcoming", or why
 * Re-crawl is off. The phone keeps the neighbourhood under the name instead
 * (`A3/03/venue-overview-m`), so its line is only the reason. While a
 * re-crawl runs, both read when it started, "Started 3:41 PM" in Mountain
 * Time (`A3/03/re-crawl-states`).
 */
export const headerLine = (
  venue: HeaderVenue,
  isPhone: boolean,
  startedAt: string | null = null,
): string => {
  const off = recrawlOff(venue);
  if (off !== null) return COPY.recrawlOff[off];
  if (startedAt !== null) return COPY.startedAt(shortTime(startedAt));
  if (isPhone) return '';
  const shows = venue.deleteBlockers?.upcomingShows ?? null;
  return [venue.neighborhood, shows === null ? null : COPY.upcoming(shows)]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
};
