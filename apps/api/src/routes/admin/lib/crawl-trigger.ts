import { eq } from 'drizzle-orm';
import { crawlTriggers, db, venues } from '@concert-crawl/db';
import { dispatchCrawlerInBackground } from '../../../lib/crawler-dispatch.js';

export type QueueVenueCrawlResult =
  | { ok: 'queued'; triggerId: string }
  | { ok: 'not_found' }
  | { ok: 'not_crawlable' }
  | { ok: 'paused' }
  | { ok: 'failed' };

/**
 * Queue one crawl trigger for a venue and wake the crawler: the body of
 * POST /v1/admin/crawl/:venueId, with the active, verified and paused gates.
 */
export const queueVenueCrawl = async (
  venueId: string,
  triggeredBy: string,
  force: boolean,
): Promise<QueueVenueCrawlResult> => {
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId));
  if (!venue) return { ok: 'not_found' };
  if (!venue.active || !venue.verified) return { ok: 'not_crawlable' };
  // A queued trigger on a paused venue would only write a skipped run, so
  // say so now. The crawler pauses a venue itself at its third failure;
  // resuming it is the recovery step.
  if (venue.crawlPausedAt !== null) return { ok: 'paused' };

  const inserted = await db
    .insert(crawlTriggers)
    .values({ venueId, triggeredBy, force })
    .returning();
  const trigger = inserted[0];
  if (!trigger) return { ok: 'failed' };

  dispatchCrawlerInBackground();
  return { ok: 'queued', triggerId: trigger.id };
};
