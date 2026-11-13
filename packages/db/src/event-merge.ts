import { and, eq, sql } from 'drizzle-orm';
import { db } from './client.js';
import {
  auditLog,
  eventRedirects,
  eventReports,
  events,
  priceRetrievalLog,
  priceSubmissions,
  spotifyAlertLog,
  userEventDismissals,
  userEvents,
} from './schema/index.js';
import type { Event } from './schema/index.js';

export interface MergeEventRowsInput {
  sourceId: string;
  targetId: string;
  actorId: string;
  /** Matcher provenance, recorded on the `event.merge` audit row only. */
  suggestion: { reason: 'date' | 'venue' } | null | undefined;
  /** Whether the caller fans out a watch notification afterwards (audit only). */
  notifyWatchers: boolean;
  /**
   * Write the `event.merge` audit row inside the transaction (default true).
   * A Needs you answer records the merge under its own audit action instead.
   */
  audit?: boolean;
}

export interface MergeEventRowsResult {
  counts: Record<string, number>;
  /**
   * The deleted source row as it was, for an audit written outside this
   * function (a Needs you answer records it as its `before`).
   */
  source: Event;
  /** People who were watching the row that is gone, read before anything moved. */
  movedWatcherIds: string[];
}

/**
 * Fold a source event into a target event: every user-side reference moves
 * onto the target, a redirect records where the source went, and the source row
 * is deleted, in one transaction. The caller has already checked that both rows
 * exist; the fan-out to watchers stays with the caller (it lives in the API
 * package and runs after this commits).
 *
 * Used by the admin merge today and by the duplicate-night cleanup next, so
 * the two cannot disagree about what a merge keeps. Any other path that
 * deletes an event does not write a redirect.
 */
export const mergeEventRows = async ({
  sourceId,
  targetId,
  actorId,
  suggestion,
  notifyWatchers,
  audit = true,
}: MergeEventRowsInput): Promise<MergeEventRowsResult> => {
  // A row merged into itself would delete the survivor, and its redirect with it.
  if (sourceId === targetId) {
    throw new Error('Cannot merge an event into itself');
  }
  return db.transaction(async (tx) => {
    // The whole source row, locked: its crawl key goes on the redirect (so
    // the crawl keeps updating the target instead of re-inserting the
    // duplicate) and the full row goes in the audit, since the row itself is
    // deleted below. Missing here means a concurrent merge or delete won.
    const [sourceRow] = await tx
      .select()
      .from(events)
      .where(eq(events.id, sourceId))
      .for('update');
    if (!sourceRow) {
      throw new Error('Source event disappeared mid-merge');
    }

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

    // A person's own "hide this delisted show" and the Spotify alert ledger are
    // one row per (person, event[, kind]) like user_events: where the target
    // already has the person's row the source's is dropped (target wins), and
    // the rest move. Both would otherwise cascade away with the source row.
    const droppedDismissals = await tx
      .delete(userEventDismissals)
      .where(
        and(
          eq(userEventDismissals.eventId, sourceId),
          sql`EXISTS (
              SELECT 1 FROM ${userEventDismissals} t
              WHERE t.event_id = ${targetId}
                AND t.user_id = ${userEventDismissals.userId}
            )`,
        ),
      )
      .returning({ id: userEventDismissals.id });
    const movedDismissals = await tx
      .update(userEventDismissals)
      .set({ eventId: targetId })
      .where(eq(userEventDismissals.eventId, sourceId))
      .returning({ id: userEventDismissals.id });

    const droppedAlerts = await tx
      .delete(spotifyAlertLog)
      .where(
        and(
          eq(spotifyAlertLog.eventId, sourceId),
          sql`EXISTS (
              SELECT 1 FROM ${spotifyAlertLog} t
              WHERE t.event_id = ${targetId}
                AND t.user_id = ${spotifyAlertLog.userId}
                AND t.kind = ${spotifyAlertLog.kind}
            )`,
        ),
      )
      .returning({ id: spotifyAlertLog.id });
    const movedAlerts = await tx
      .update(spotifyAlertLog)
      .set({ eventId: targetId })
      .where(eq(spotifyAlertLog.eventId, sourceId))
      .returning({ id: spotifyAlertLog.id });

    // Redirects: whatever already pointed at the source now points at the
    // target (before the source row goes, or the cascade would take them), and
    // the source itself gets one. A chain is never longer than one hop.
    await tx
      .update(eventRedirects)
      .set({ targetId })
      .where(eq(eventRedirects.targetId, sourceId));
    const sourceKey = {
      sourceVenueId: sourceRow.venueId,
      sourceDate: sourceRow.date,
      sourceCanonicalArtist: sourceRow.canonicalArtist,
      sourceShowTime: sourceRow.showTime,
    };
    await tx
      .insert(eventRedirects)
      .values({ sourceId, targetId, ...sourceKey })
      .onConflictDoUpdate({
        target: eventRedirects.sourceId,
        set: { targetId, ...sourceKey },
      });

    // With every reference moved, deleting the source row is safe — there's
    // nothing left to cascade. Doing this last means a failure earlier in
    // the transaction never reaches the destructive step.
    //
    // The DELETE returns the affected rows so we can detect a concurrent
    // race: if a parallel merge (or delete) cleared the source between the
    // caller's existence check and now, we'd otherwise commit a no-op
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
      dismissalsMoved: movedDismissals.length,
      dismissalsDropped: droppedDismissals.length,
      alertsMoved: movedAlerts.length,
      alertsDropped: droppedAlerts.length,
    };

    if (audit) {
      await tx.insert(auditLog).values({
        actorId,
        action: 'event.merge',
        targetId,
        metadata: {
          sourceId,
          source: sourceRow,
          referencesMoved: counts,
          suggestion: suggestion ?? null,
          notifyWatchers,
        },
      });
    }

    return {
      counts,
      source: sourceRow,
      movedWatcherIds: movedWatchers.map((row) => row.userId),
    };
  });
};
