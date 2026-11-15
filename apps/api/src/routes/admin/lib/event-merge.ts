import { eq, or } from 'drizzle-orm';
import {
  db,
  EventMergeRefusedError,
  events,
  mergeEventRows,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';
import { apiLogger } from '../../../lib/logger.js';
import {
  isRetryableTxError,
  isUniqueViolationOn,
} from '../../../lib/pg-errors.js';

// The partial unique index on (venue_id, date, canonical_artist, show_time)
// WHERE status = 'upcoming' (migration 0057) that the crawler upserts on.
export const EVENT_NIGHT_UNIQUE_INDEX =
  'events_venue_date_canonical_artist_showtime_idx';

export interface MergeEventsInput {
  sourceId: string;
  targetId: string;
  actorId: string;
  /** Fire the watch-update fan-out on the target after the merge commits. */
  notifyWatchers: boolean;
  /** Matcher provenance, recorded on the `event.merge` audit row only. */
  suggestion: { reason: 'date' | 'venue' } | null | undefined;
  /**
   * A confirmed relocation (the Needs-you move answers, or a POST that says
   * so): the admin merge's rules are skipped. Otherwise (admin 4b E4) the
   * target's blank fields are filled from the source and a past row merges
   * only with another past row. A show moved from a date now past to a later
   * one is exactly the pair a relocation merges, and an old listing's fields
   * are not the new one's. `notifyWatchers` alone does not skip the rules.
   */
  relocation?: boolean;
}

export type MergeEventsResult =
  | {
      ok: 'merged';
      referencesMoved: Record<string, number>;
      /** In-app notices written to the movers; 0 when no one was told. */
      watchersNotified: number;
      /** The target's blank fields the merge filled (`MergeFillField`). */
      filled: string[];
      /** Blank fields it left blank (`adminMergeFill`). */
      skipped: string[];
    }
  | { ok: 'source_not_found' }
  | { ok: 'target_not_found' }
  | { ok: 'past_mismatch' }
  /** Another upcoming row took the night key the fill would write. */
  | { ok: 'time_taken' };

/**
 * Fold a source event into a target event: every user-side reference moves
 * onto the target, a redirect records where the source went, and the source
 * row is deleted, in one transaction (`mergeEventRows` in @concert-crawl/db,
 * shared with the duplicate-night cleanup). See POST
 * /v1/admin/events/:id/merge for the full contract.
 */
export const mergeEvents = async ({
  actorId,
  notifyWatchers,
  suggestion,
  relocation = false,
  ...ids
}: MergeEventsInput): Promise<MergeEventsResult> => {
  // Postgres reads a uuid in any case; the rows come back lowercase.
  const sourceId = ids.sourceId.toLowerCase();
  const targetId = ids.targetId.toLowerCase();
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

  // The existence check above is only the cheap path: the core re-reads both
  // rows under FOR UPDATE locks, and a row a concurrent merge or delete took
  // in between is refused there, rolled back, and answered like a miss.
  //
  // Merges take events in id order, then user_events; the crawl's upsert and
  // the stale sweep do not share that order, so a deadlock with one is
  // possible, if rare. Postgres aborts one side and rolls it back whole, so
  // the merge is retried once before the error surfaces.
  const merge = () =>
    mergeEventRows({
      sourceId,
      targetId,
      actorId,
      suggestion,
      notifyWatchers,
      ...(relocation ? {} : { fillBlanks: true, checkPast: true }),
    });
  let merged: Awaited<ReturnType<typeof mergeEventRows>>;
  try {
    try {
      merged = await merge();
    } catch (err) {
      if (!isRetryableTxError(err)) throw err;
      apiLogger.warn({ sourceId, targetId }, 'event merge: retrying once');
      merged = await merge();
    }
  } catch (err) {
    if (err instanceof EventMergeRefusedError) return { ok: err.reason };
    // The fill checks the night key under the locks; a row inserted after
    // that check can still take it. Nothing was written.
    if (isUniqueViolationOn(err, EVENT_NIGHT_UNIQUE_INDEX)) {
      return { ok: 'time_taken' };
    }
    throw err;
  }

  // After commit, mirroring the PATCH call site: the fan-out is best-effort
  // by contract and never throws, so it must not sit inside the transaction
  // that moved the watch rows.
  //
  // A relocation is decided by comparing the two rows, not by trusting the
  // caller's `suggestion.reason` — the copy a watcher reads is not a client
  // decision. Same venue means the night changed, which is what the plain
  // postponed template already says.
  let watchersNotified = 0;
  if (notifyWatchers) {
    // Only the venue ids decide this. `venueName` may be null because
    // `events.venue_id` is ON DELETE SET NULL, and falling back to the date
    // template there would claim the night changed when it did not — the
    // copy handles a null old room itself.
    const relocated =
      source.venueId !== target.venueId
        ? { fromVenueName: source.venueName }
        : null;
    const sent = await fanoutWatchNotification(
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
    watchersNotified = sent.watchersNotified;
  }

  return {
    ok: 'merged',
    referencesMoved: merged.counts,
    watchersNotified,
    filled: merged.filled,
    skipped: merged.skipped,
  };
};
