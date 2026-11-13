import { eq, or } from 'drizzle-orm';
import {
  db,
  events,
  mergeEventRows,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import type { Event } from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';

export interface MergeEventsInput {
  sourceId: string;
  targetId: string;
  actorId: string;
  /** Fire the watch-update fan-out on the target after the merge commits. */
  notifyWatchers: boolean;
  /** Matcher provenance, recorded on the `event.merge` audit row only. */
  suggestion: { reason: 'date' | 'venue' } | null | undefined;
  /**
   * Write the `event.merge` audit row inside the transaction (default true).
   * A Needs you answer records the merge under its own audit action instead.
   */
  audit?: boolean;
}

export type MergeEventsResult =
  | {
      ok: 'merged';
      referencesMoved: Record<string, number>;
      /** The deleted source row as it was, for an audit written by the caller. */
      source: Event;
    }
  | { ok: 'source_not_found' }
  | { ok: 'target_not_found' };

/**
 * Fold a source event into a target event: every user-side reference moves
 * onto the target, a redirect records where the source went, and the source
 * row is deleted, in one transaction (`mergeEventRows` in @concert-crawl/db,
 * shared with the duplicate-night cleanup). See POST
 * /v1/admin/events/:id/merge for the full contract.
 */
export const mergeEvents = async ({
  sourceId,
  targetId,
  actorId,
  notifyWatchers,
  suggestion,
  audit = true,
}: MergeEventsInput): Promise<MergeEventsResult> => {
  // Pre-flight existence checks return 404 with a clear message before we
  // open a transaction — cheaper than rolling back inside.
  //
  // venueId + venueName come back too: the source row is deleted by the
  // merge, so the venue a watcher knew the show under has to be captured
  // here or it is gone before the fan-out can name it.
  const both = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(or(eq(events.id, sourceId), eq(events.id, targetId)));
  const source = both.find((row) => row.id === sourceId);
  const target = both.find((row) => row.id === targetId);
  if (!source) {
    return { ok: 'source_not_found' };
  }
  if (!target) {
    return { ok: 'target_not_found' };
  }

  const merged = await mergeEventRows({
    sourceId,
    targetId,
    actorId,
    suggestion,
    notifyWatchers,
    audit,
  });

  // After commit, mirroring the PATCH call site: the fan-out is best-effort
  // by contract and never throws, so it must not sit inside the transaction
  // that moved the watch rows.
  //
  // A relocation is decided by comparing the two rows, not by trusting the
  // caller's `suggestion.reason` — the copy a watcher reads is not a client
  // decision. Same venue means the night changed, which is what the plain
  // postponed template already says.
  if (notifyWatchers) {
    // Only the venue ids decide this. `venueName` may be null because
    // `events.venue_id` is ON DELETE SET NULL, and falling back to the date
    // template there would claim the night changed when it did not — the
    // copy handles a null old room itself.
    const relocated =
      source.venueId !== target.venueId
        ? { fromVenueName: source.venueName }
        : null;
    await fanoutWatchNotification(
      { db, notifications, userEvents, events, venues },
      {
        eventId: targetId,
        category: 'watch.postponed',
        // #1311: the source row is deleted by the merge, so it can only be
        // merged away once; its id names this transition.
        transition: `merge:${sourceId}`,
        restrictToUserIds: merged.movedWatcherIds,
        // Spread rather than pass `undefined`: exactOptionalPropertyTypes
        // distinguishes an absent key from an explicitly-undefined one.
        ...(relocated ? { relocated } : {}),
      },
    );
  }

  return {
    ok: 'merged',
    referencesMoved: merged.counts,
    source: merged.source,
  };
};
