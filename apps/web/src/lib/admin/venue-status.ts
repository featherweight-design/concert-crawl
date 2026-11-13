import type { Venue } from '@concert-crawl/types';

export type VenueStatus = 'active' | 'paused' | 'blocked';

export function deriveVenueStatus(
  venue: Pick<Venue, 'active' | 'blockedAt' | 'consecutiveFailures'>,
): VenueStatus {
  if (venue.blockedAt !== null && venue.consecutiveFailures > 0)
    return 'blocked';
  if (!venue.active) return 'paused';
  return 'active';
}

export function venueHealthPercent(
  venue: Pick<Venue, 'consecutiveFailures'>,
): number {
  return venue.consecutiveFailures === 0
    ? 100
    : Math.max(0, 100 - venue.consecutiveFailures * 20);
}

export type VenueOnSite = 'live' | 'hidden' | 'draft';
export type VenueCrawling =
  'crawling' | 'paused' | 'auto_paused' | 'blocked' | 'robots_disallowed';

export interface VenueStatusChips {
  onSite: VenueOnSite;
  crawling: VenueCrawling;
}

/** Three failures in a row is what pauses a crawl on its own (crawl rules). */
export const AUTO_PAUSE_FAILURES = 3;

/**
 * The one rule for an automatic pause, shared by the crawling chip, the paused
 * line and the ⋯ menu so they never disagree: paused, no reason, and 3+
 * failures. Every admin pause path requires a reason (`pauseBodySchema`) and
 * the crawler's auto-pause writes none, so a pause with a reason is a hand
 * pause however many failures are on the counter. Blocked is its own case.
 */
export const isAutoPause = (
  venue: Pick<Venue, 'crawlPausedAt' | 'consecutiveFailures'> & {
    crawlPauseReason?: Venue['crawlPauseReason'];
  },
): boolean =>
  venue.crawlPausedAt !== null &&
  (venue.crawlPauseReason ?? null) === null &&
  venue.consecutiveFailures >= AUTO_PAUSE_FAILURES;

/**
 * The two-axis venue status (plan decision 6, rule 2): whether the venue is on
 * the site, and whether we're crawling it. Pausing never hides; hiding is
 * `active=false`. Blocked wins over everything on the crawl axis because a
 * 403 or 429 means the site asked us to stop, whatever else is set.
 *
 * `draft` arrives with 3c's `went_live_at`; until then every venue is live or
 * hidden.
 *
 * Auto-paused is `isAutoPause`: a pause with a reason is a hand pause even
 * after a failing streak.
 */
export function deriveVenueStatusChips(
  venue: Pick<
    Venue,
    | 'active'
    | 'crawlPausedAt'
    | 'blockedAt'
    | 'consecutiveFailures'
    | 'robotsTxtAllowed'
  > & { crawlPauseReason?: Venue['crawlPauseReason'] },
): VenueStatusChips {
  const onSite: VenueOnSite = venue.active ? 'live' : 'hidden';
  if (venue.blockedAt !== null) return { onSite, crawling: 'blocked' };
  if (venue.robotsTxtAllowed === false) {
    return { onSite, crawling: 'robots_disallowed' };
  }
  if (venue.crawlPausedAt !== null) {
    return {
      onSite,
      crawling: isAutoPause(venue) ? 'auto_paused' : 'paused',
    };
  }
  return { onSite, crawling: 'crawling' };
}
