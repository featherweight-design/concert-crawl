// Which venues Crawl all queues, in one place: POST /v1/admin/crawl queues by
// it and GET /v1/admin/crawl/estimate counts by it, so the confirm's numbers
// are the ones the button acts on. Removed venues are never crawled and never
// counted; the caller leaves them out of the read.

import type { CrawlAllSkipReason } from '@concert-crawl/types';

export interface CrawlAllVenue {
  active: boolean;
  verified: boolean;
  blockedAt: Date | null;
  crawlPausedAt: Date | null;
}

/**
 * Why Crawl all skips a venue, or null when it queues it. A blocked venue is
 * retried only by a person queueing it on its own, the same exclusion the
 * daily pass applies. Blocked wins over paused, since it is the one an admin
 * has to look at.
 */
export const crawlAllSkipReason = (
  venue: CrawlAllVenue,
): CrawlAllSkipReason | null => {
  if (venue.blockedAt !== null) return 'blocked';
  if (venue.crawlPausedAt !== null) return 'paused';
  if (!venue.active) return 'hidden';
  if (!venue.verified) return 'unverified';
  return null;
};
