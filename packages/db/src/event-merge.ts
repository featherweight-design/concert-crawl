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
import {
  type MergeFillField,
  mergeFillsFrom,
  mergeFillWritesBill,
} from './event-merge-fill.js';
import { syncEventArtists } from './event-artists-sync.js';

export interface MergeEventRowsInput {
  sourceId: string;
  targetId: string;
  actorId: string;
  /** Matcher provenance, recorded on the `event.merge` audit row only. */
  suggestion: { reason: 'date' | 'venue' } | null | undefined;
  /** Whether the caller fans out a watch notification afterwards (audit only). */
  notifyWatchers: boolean;
  /**
   * Fill the target's blank columns from the source (`mergeFillsFrom`, the
   * duplicate-night cleanup's rule), in this transaction, after the source is
   * gone. The admin merge sets it; the cleanup fills on its own afterwards,
   * from every folded row at once.
   */
  fillBlanks?: boolean;
  /**
   * Today in Denver (`YYYY-MM-DD`). When given, a past row merges only with
   * another past row: one past and one not is refused `past_mismatch`, judged
   * under the row locks.
   */
  today?: string;
}

export interface MergeEventRowsResult {
  counts: Record<string, number>;
  /** People who were watching the row that is gone, read before anything moved. */
  movedWatcherIds: string[];
  /** The fill's fields (`MergeFillField`) written onto the target; [] when none. */
  filled: MergeFillField[];
}

export type EventMergeRefusal =
  'source_not_found' | 'target_not_found' | 'past_mismatch';

/**
 * A merge refused under the row locks. Thrown inside the transaction, so
 * nothing is written. Missing rows mean a concurrent merge or delete won.
 */
export class EventMergeRefusedError extends Error {
  constructor(readonly reason: EventMergeRefusal) {
    super(
      reason === 'source_not_found'
        ? 'Source event disappeared mid-merge'
        : reason === 'target_not_found'
          ? 'Target event disappeared mid-merge'
          : 'One row is past and the other is not',
    );
    this.name = 'EventMergeRefusedError';
  }
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
  fillBlanks = false,
  today,
}: MergeEventRowsInput): Promise<MergeEventRowsResult> => {
  // A row merged into itself would delete the survivor, and its redirect with it.
  if (sourceId === targetId) {
    throw new Error('Cannot merge an event into itself');
  }
  return db.transaction(async (tx) => {
    // BOTH rows, locked FOR UPDATE, one statement each in id order. Lock
    // order is events in id order, then user_events (the moves below), the
    // same order the admin delete guard takes (routes/admin/lib/
    // event-delete.ts), so:
    // - two merges of one pair in opposite directions queue on the lower id
    //   instead of deadlocking; the second then finds its source gone;
    // - a merge into a manual row a delete holds waits for it, then finds
    //   the row gone (refused `target_not_found`) or merges into it.
    // The duplicate-night cleanup calls this per folded row, so it takes the
    // same order.
    //
    // The source's crawl key goes on the redirect (so the crawl keeps
    // updating the target instead of re-inserting the duplicate) and its
    // full row goes in the audit, since the row itself is deleted below.
    const locked = new Map<string, typeof events.$inferSelect>();
    for (const id of [sourceId, targetId].sort()) {
      const [row] = await tx
        .select()
        .from(events)
        .where(eq(events.id, id))
        .for('update');
      if (row) locked.set(id, row);
    }
    const sourceRow = locked.get(sourceId);
    const targetRow = locked.get(targetId);
    if (!sourceRow) throw new EventMergeRefusedError('source_not_found');
    if (!targetRow) throw new EventMergeRefusedError('target_not_found');
    // Admin 4b (E4): a past show merges only with another past show. Judged
    // here, under the locks, so a PATCH that moved a date is seen.
    if (
      today !== undefined &&
      sourceRow.date < today !== targetRow.date < today
    ) {
      throw new EventMergeRefusedError('past_mismatch');
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
    // `notifyWatchers` is the confirmed-move path (see the admin merge's
    // schema), so it is also what marks the redirect as a move.
    const reason = notifyWatchers ? ('moved' as const) : null;
    await tx
      .insert(eventRedirects)
      .values({ sourceId, targetId, reason, ...sourceKey })
      .onConflictDoUpdate({
        target: eventRedirects.sourceId,
        set: { targetId, reason, ...sourceKey },
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
      throw new EventMergeRefusedError('source_not_found');
    }

    // The fill, with the source gone (so a show time taken from it cannot
    // collide with it on the night's unique index) and the target still
    // locked, so the row it was computed from is the row it writes.
    const fill = fillBlanks
      ? mergeFillsFrom(targetRow, [sourceRow])
      : { fields: [], values: {} };
    if (fill.fields.length > 0) {
      await tx
        .update(events)
        .set({ ...fill.values, updatedAt: new Date() })
        .where(eq(events.id, targetId));
    }
    // A filled bill rebuilds the target's lineup rows in the same
    // transaction (events stay locked first, then event_artists), so the
    // merge never commits a bill its `event_artists` rows do not show. The
    // source's own lineup rows cascaded away with it.
    if (mergeFillWritesBill(fill.fields)) {
      await syncEventArtists(tx, [targetId]);
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

    // Every merge path audits the same way, Needs you answers included: the
    // answer's own row cannot hold the deleted row (its `before` is the undo
    // snapshot, and a fan-notifying answer is never undoable).
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
        filled: fill.fields,
      },
    });

    return {
      counts,
      movedWatcherIds: movedWatchers.map((row) => row.userId),
      filled: fill.fields,
    };
  });
};
