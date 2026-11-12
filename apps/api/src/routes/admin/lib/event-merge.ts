import { and, eq, or, sql } from 'drizzle-orm';
import {
  auditLog,
  db,
  eventReports,
  events,
  notifications,
  priceRetrievalLog,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db';
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
  | { ok: 'merged'; referencesMoved: Record<string, number> }
  | { ok: 'source_not_found' }
  | { ok: 'target_not_found' };

/**
 * Fold a source event into a target event: every user-side reference moves
 * onto the target and the source row is deleted, in one transaction. See
 * POST /v1/admin/events/:id/merge for the full contract.
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

  const merged = await db.transaction(async (tx) => {
    // Captured BEFORE any row moves: these are the users who were watching
    // the row that is disappearing, and they are the only ones for whom
    // anything changed. Reading watchers off the target after the merge
    // would also sweep up people who only ever watched the target.
    const movedWatchers = await tx
      .select({ userId: userEvents.userId })
      .from(userEvents)
      .where(
        and(
          eq(userEvents.eventId, sourceId),
          eq(userEvents.status, 'watching'),
        ),
      );

    // user_events: drop conflicting source rows (target wins) before moving
    // the rest. Doing the delete inside the same transaction means a partial
    // failure rolls the drops back too.
    // Before dropping the losing source rows, salvage their attendance onto
    // the target: an attended night must not vanish because an admin merged
    // two listings for the same show (#70). LEAST() keeps the earliest
    // commitment, which is the honest timestamp for when the user decided.
    // Postgres LEAST/GREATEST ignore NULL arguments (unlike most other SQL
    // dialects and unlike ordinary operators) and return NULL only when
    // every argument is NULL — so a watching-only target with a NULL
    // attending_at correctly adopts the source's timestamp. No COALESCE
    // wrapper needed; adding one would be a no-op here.
    const coalescedAttending = await tx
      .update(userEvents)
      .set({
        attendingAt: sql`LEAST(
            ${userEvents.attendingAt},
            (SELECT src.attending_at FROM ${userEvents} src
              WHERE src.event_id = ${sourceId}
                AND src.user_id = ${userEvents.userId})
          )`,
      })
      .where(
        and(
          eq(userEvents.eventId, targetId),
          sql`EXISTS (
              SELECT 1 FROM ${userEvents} src
              WHERE src.event_id = ${sourceId}
                AND src.user_id = ${userEvents.userId}
                AND src.attending_at IS NOT NULL
            )`,
        ),
      )
      .returning({ id: userEvents.id });

    const droppedUserEvents = await tx
      .delete(userEvents)
      .where(
        and(
          eq(userEvents.eventId, sourceId),
          sql`EXISTS (
              SELECT 1 FROM ${userEvents} t
              WHERE t.event_id = ${targetId}
                AND t.user_id = ${userEvents.userId}
            )`,
        ),
      )
      .returning({ id: userEvents.id });

    const movedUserEvents = await tx
      .update(userEvents)
      .set({ eventId: targetId })
      .where(eq(userEvents.eventId, sourceId))
      .returning({ id: userEvents.id });

    const movedReports = await tx
      .update(eventReports)
      .set({ eventId: targetId })
      .where(eq(eventReports.eventId, sourceId))
      .returning({ id: eventReports.id });

    const movedSubmissions = await tx
      .update(priceSubmissions)
      .set({ eventId: targetId, updatedAt: new Date() })
      .where(eq(priceSubmissions.eventId, sourceId))
      .returning({ id: priceSubmissions.id });

    const movedLogs = await tx
      .update(priceRetrievalLog)
      .set({ eventId: targetId })
      .where(eq(priceRetrievalLog.eventId, sourceId))
      .returning({ id: priceRetrievalLog.id });

    // With every reference moved, deleting the source row is safe — there's
    // nothing left to cascade. Doing this last means a failure earlier in
    // the transaction never reaches the destructive step.
    //
    // The DELETE returns the affected rows so we can detect a concurrent
    // race: if a parallel merge (or delete) cleared the source between the
    // pre-flight existence check and now, we'd otherwise commit a no-op
    // with a misleading "success" + audit row. Throwing rolls the whole
    // transaction back.
    const deletedSource = await tx
      .delete(events)
      .where(eq(events.id, sourceId))
      .returning({ id: events.id });
    if (deletedSource.length === 0) {
      throw new Error('Source event disappeared mid-merge');
    }

    const counts = {
      userEventsMoved: movedUserEvents.length,
      userEventsDropped: droppedUserEvents.length,
      attendingCoalesced: coalescedAttending.length,
      reportsMoved: movedReports.length,
      submissionsMoved: movedSubmissions.length,
      priceLogsMoved: movedLogs.length,
    };

    if (audit) {
      await tx.insert(auditLog).values({
        actorId,
        action: 'event.merge',
        targetId,
        metadata: {
          sourceId,
          referencesMoved: counts,
          suggestion: suggestion ?? null,
          notifyWatchers,
        },
      });
    }

    return {
      counts,
      movedWatcherIds: movedWatchers.map((row) => row.userId),
    };
  });
  const referencesMoved = merged.counts;

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

  return { ok: 'merged', referencesMoved };
};
