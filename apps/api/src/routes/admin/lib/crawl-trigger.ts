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

/** The refusals only a trial (a test re-crawl) can meet. */
export type QueueTrialRefusal =
  { ok: 'not_paused' } | { ok: 'blocked' } | { ok: 'trial_pending' };

type QueueOutcome = QueueVenueCrawlResult | QueueTrialRefusal;

/**
 * Queue one crawl trigger for a venue and wake the crawler: the body of
 * POST /v1/admin/crawl/:venueId, with the removed, active, verified and paused
 * gates.
 *
 * `trial` queues a test re-crawl instead (migration 0119): allowed only on a
 * crawl-paused venue that is not blocked, one pending at a time per venue. Its
 * run is a real crawl that never moves the pause or the failure streak, so the
 * paused gate inverts for it. Every other gate is the same.
 */
export async function queueVenueCrawl(
  venueId: string,
  triggeredBy: string,
  force: boolean,
  trial?: false,
): Promise<QueueVenueCrawlResult>;
export async function queueVenueCrawl(
  venueId: string,
  triggeredBy: string,
  force: boolean,
  trial: boolean,
): Promise<QueueOutcome>;
export async function queueVenueCrawl(
  venueId: string,
  triggeredBy: string,
  force: boolean,
  trial = false,
): Promise<QueueOutcome> {
  const outcome = await db.transaction(async (tx): Promise<QueueOutcome> => {
    const [venue] = await tx
      .select()
      .from(venues)
      .where(eq(venues.id, venueId));
    if (!venue) return { ok: 'not_found' };
    // Checked first and on its own, so a removed venue is refused as removed
    // whatever its other columns say. There is no crawl path back for it.
    if (venue.removedAt !== null) return { ok: 'removed' };
    if (!venue.active || !venue.verified) return { ok: 'not_crawlable' };
    if (trial) {
      // A blocked venue answered 403/429: trying it again is the very thing
      // it asked us not to do, so a trial waits for the block to be cleared.
      if (venue.blockedAt !== null) return { ok: 'blocked' };
      // A trial is the paused venue's check before resuming it. A venue
      // that is not paused takes an ordinary crawl.
      if (venue.crawlPausedAt === null) return { ok: 'not_paused' };
    } else if (venue.crawlPausedAt !== null) {
      // A queued trigger on a paused venue would only write a skipped run,
      // so say so now. The crawler pauses a venue itself at its third
      // failure; resuming it is the recovery step.
      return { ok: 'paused' };
    }
    // robots.txt disallows us: never overridden, `force` included (force
    // only bypasses the page-unchanged skip). `null` is "not checked yet",
    // which the crawler itself resolves before it fetches anything.
    if (venue.robotsTxtAllowed === false) {
      return { ok: 'robots_disallowed' };
    }

    // The read above takes no lock, so a removal can commit after it. This
    // share lock waits out one in flight (removal locks the row FOR UPDATE)
    // and re-checks removed_at, and holds it until the trigger is written.
    // A trial takes the row FOR UPDATE instead, so two trials on one venue
    // queue behind each other and the second sees the first's trigger.
    const [unremoved] = await tx
      .select({ id: venues.id })
      .from(venues)
      .where(and(eq(venues.id, venueId), isNull(venues.removedAt)))
      .for(trial ? 'update' : 'share');
    if (!unremoved) return { ok: 'removed' };

    if (trial) {
      const [pending] = await tx
        .select({ id: crawlTriggers.id })
        .from(crawlTriggers)
        .where(
          and(
            eq(crawlTriggers.venueId, venueId),
            eq(crawlTriggers.trial, true),
            eq(crawlTriggers.status, 'pending'),
          ),
        )
        .limit(1);
      if (pending) return { ok: 'trial_pending' };
    }

    const inserted = await tx
      .insert(crawlTriggers)
      .values({ venueId, triggeredBy, force, trial })
      .returning();
    const trigger = inserted[0];
    if (!trigger) return { ok: 'failed' };
    return { ok: 'queued', triggerId: trigger.id };
  });

  // Only once the trigger has committed: nothing wakes for a refusal.
  if (outcome.ok === 'queued') {
    dispatchCrawlerInBackground({ triggerIds: [outcome.triggerId] });
  }
  return outcome;
}
