import { and, eq, inArray, isNull } from 'drizzle-orm';
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

export type QueueVenueTrialResult =
  | { ok: 'queued'; triggerId: string }
  | { ok: 'not_found' }
  | { ok: 'removed' }
  | { ok: 'not_crawlable' }
  | { ok: 'blocked' }
  | { ok: 'not_paused' }
  | { ok: 'trial_pending' }
  | { ok: 'robots_disallowed' }
  | { ok: 'failed' };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Venue = typeof venues.$inferSelect;

/**
 * The gates every one-venue trigger shares, on an unlocked read: the venue
 * exists, is not removed, and is active and verified.
 */
const readTriggerableVenue = async (
  tx: Tx,
  venueId: string,
): Promise<
  | { ok: 'venue'; venue: Venue }
  | { ok: 'not_found' }
  | { ok: 'removed' }
  | { ok: 'not_crawlable' }
> => {
  const [venue] = await tx.select().from(venues).where(eq(venues.id, venueId));
  if (!venue) return { ok: 'not_found' };
  // Checked first and on its own, so a removed venue is refused as removed
  // whatever its other columns say. There is no crawl path back for it.
  if (venue.removedAt !== null) return { ok: 'removed' };
  if (!venue.active || !venue.verified) return { ok: 'not_crawlable' };
  return { ok: 'venue', venue };
};

/** Write the trigger and return its id, or `failed` when no row came back. */
const insertTrigger = async (
  tx: Tx,
  values: typeof crawlTriggers.$inferInsert,
): Promise<{ ok: 'queued'; triggerId: string } | { ok: 'failed' }> => {
  const inserted = await tx.insert(crawlTriggers).values(values).returning();
  const trigger = inserted[0];
  if (!trigger) return { ok: 'failed' };
  return { ok: 'queued', triggerId: trigger.id };
};

/** Wake the crawler only once the trigger has committed: never for a refusal. */
const wakeIfQueued = (
  outcome: QueueVenueTrialResult | QueueVenueCrawlResult,
) => {
  if (outcome.ok === 'queued') {
    dispatchCrawlerInBackground({ triggerIds: [outcome.triggerId] });
  }
};

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
      const read = await readTriggerableVenue(tx, venueId);
      if (read.ok !== 'venue') return read;
      const { venue } = read;
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

      return insertTrigger(tx, { venueId, triggeredBy, force });
    },
  );

  wakeIfQueued(outcome);
  return outcome;
};

/**
 * Queue a test re-crawl of a crawl-paused venue (migration 0119) and wake the
 * crawler. Its run is a real crawl that never moves the venue's pause or
 * failure streak. Allowed only on a paused venue that is not blocked, with one
 * trial per venue waiting or running at a time; the shared gates and the
 * robots.txt gate are the ordinary trigger's.
 */
export const queueVenueTrial = async (
  venueId: string,
  triggeredBy: string,
): Promise<QueueVenueTrialResult> => {
  const outcome = await db.transaction(
    async (tx): Promise<QueueVenueTrialResult> => {
      const read = await readTriggerableVenue(tx, venueId);
      if (read.ok !== 'venue') return read;

      // The pause and block gates are read under FOR UPDATE: a resume, a
      // block or a removal committing mid-request is waited out and seen, and
      // two trials on one venue queue behind each other, so the second sees
      // the first's trigger.
      const [locked] = await tx
        .select({
          crawlPausedAt: venues.crawlPausedAt,
          blockedAt: venues.blockedAt,
          robotsTxtAllowed: venues.robotsTxtAllowed,
        })
        .from(venues)
        .where(and(eq(venues.id, venueId), isNull(venues.removedAt)))
        .for('update');
      if (!locked) return { ok: 'removed' };
      // A blocked venue answered 403/429: trying it again is the very thing
      // it asked us not to do, so a trial waits for the block to be cleared.
      if (locked.blockedAt !== null) return { ok: 'blocked' };
      // A trial is the paused venue's check before resuming it. A venue that
      // is not paused takes an ordinary crawl.
      if (locked.crawlPausedAt === null) return { ok: 'not_paused' };
      // Never overridden, as for the ordinary trigger.
      if (locked.robotsTxtAllowed === false) {
        return { ok: 'robots_disallowed' };
      }

      // One trial per venue until it has run: a claimed one ('processing')
      // still holds the place, so a second press never stacks another.
      const [open] = await tx
        .select({ id: crawlTriggers.id })
        .from(crawlTriggers)
        .where(
          and(
            eq(crawlTriggers.venueId, venueId),
            eq(crawlTriggers.trial, true),
            inArray(crawlTriggers.status, ['pending', 'processing']),
          ),
        )
        .limit(1);
      if (open) return { ok: 'trial_pending' };

      return insertTrigger(tx, {
        venueId,
        triggeredBy,
        force: false,
        trial: true,
      });
    },
  );

  wakeIfQueued(outcome);
  return outcome;
};
