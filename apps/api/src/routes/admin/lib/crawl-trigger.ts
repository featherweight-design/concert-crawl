import { and, eq, isNull } from 'drizzle-orm';
import { crawlTriggers, db, venues } from '@concert-crawl/db';
import { dispatchCrawlerInBackground } from '../../../lib/crawler-dispatch.js';

export type QueueVenueCrawlResult =
  | { ok: 'queued'; triggerId: string }
  | { ok: 'not_found' }
  | { ok: 'removed' }
  | { ok: 'not_crawlable' }
  | { ok: 'paused' }
  | { ok: 'robots_disallowed' }
  | { ok: 'failed' };

/**
 * Queue one crawl trigger for a venue and wake the crawler: the body of
 * POST /v1/admin/crawl/:venueId, with the removed, active, verified and paused
 * gates.
 */
export const queueVenueCrawl = async (
  venueId: string,
  triggeredBy: string,
  force: boolean,
): Promise<QueueVenueCrawlResult> => {
  const outcome = await db.transaction(
    async (tx): Promise<QueueVenueCrawlResult> => {
      const [venue] = await tx
        .select()
        .from(venues)
        .where(eq(venues.id, venueId));
      if (!venue) return { ok: 'not_found' };
      // Checked first and on its own, so a removed venue is refused as removed
      // whatever its other columns say. There is no crawl path back for it.
      if (venue.removedAt !== null) return { ok: 'removed' };
      if (!venue.active || !venue.verified) return { ok: 'not_crawlable' };
      // A queued trigger on a paused venue would only write a skipped run, so
      // say so now. The crawler pauses a venue itself at its third failure;
      // resuming it is the recovery step.
      if (venue.crawlPausedAt !== null) return { ok: 'paused' };
      // robots.txt disallows us: never overridden, `force` included (force
      // only bypasses the page-unchanged skip). `null` is "not checked yet",
      // which the crawler itself resolves before it fetches anything.
      if (venue.robotsTxtAllowed === false) {
        return { ok: 'robots_disallowed' };
      }

      // The read above takes no lock, so a removal can commit after it. This
      // share lock waits out one in flight (removal locks the row FOR UPDATE)
      // and re-checks removed_at, and holds it until the trigger is written.
      const [unremoved] = await tx
        .select({ id: venues.id })
        .from(venues)
        .where(and(eq(venues.id, venueId), isNull(venues.removedAt)))
        .for('share');
      if (!unremoved) return { ok: 'removed' };

      const inserted = await tx
        .insert(crawlTriggers)
        .values({ venueId, triggeredBy, force })
        .returning();
      const trigger = inserted[0];
      if (!trigger) return { ok: 'failed' };
      return { ok: 'queued', triggerId: trigger.id };
    },
  );

  // Only once the trigger has committed: nothing wakes for a refusal.
  if (outcome.ok === 'queued') {
    dispatchCrawlerInBackground({ triggerIds: [outcome.triggerId] });
  }
  return outcome;
};
