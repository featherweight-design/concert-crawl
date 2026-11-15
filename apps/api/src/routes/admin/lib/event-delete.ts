// The admin event delete guard (E5-a, plan 4b#10). A delete is a hard delete
// and every row that names the event cascades with it, so it is allowed only
// where nothing is lost:
//
// - Only a manual row (`events.manual`, a show an admin added). A crawled row
//   would come back on the next crawl with fresh ids and nobody on it, so it
//   is refused `not_manual`; Hide is the tool for those.
// - Only a row nobody depends on. Watchers (`user_events` with status
//   `watching`), Concerts (`user_events` with status `going` or
//   `attending_at` set), Submitted prices (`price_submissions`, any status) and
//   incoming `event_redirects` (a merged-away listing that now resolves here)
//   all cascade on delete, so any of them refuses `has_dependents` with the
//   counts.
// - Not counted, by orchestrator ruling: `event_reports`, `event_artists`,
//   `price_retrieval_log`, `user_event_dismissals`, the spotify rows and
//   `user_events` marked only Interested. These are admin or derived rows,
//   and they are dropped with the show.
//
// Check and delete run in the caller's transaction, after `SELECT ... FOR
// UPDATE` on the manual events and their `user_events` rows, and the counts
// are read under those locks. A new Watcher, Concert, submission or redirect
// inserts a row whose foreign key takes a KEY SHARE lock on the event, which
// waits on ours; an existing `user_events` row changing status waits on the
// row lock. So nothing can attach between the count and the delete.

import { and, asc, count, eq, inArray, isNotNull, or } from 'drizzle-orm';
import {
  eventRedirects,
  events,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db';
import type { DbTransaction } from '../../../lib/db-executor.js';

export interface EventDependentCounts {
  watchers: number;
  concerts: number;
  submittedPrices: number;
  redirects: number;
}

export type EventDeleteRefusal =
  | { id: string; reason: 'not_manual' }
  | { id: string; reason: 'has_dependents'; counts: EventDependentCounts };

/** What the audit row records about a deleted event. */
export interface DeletedEventDetail {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string;
  venueId: string | null;
  venueName: string | null;
  wasVerified: boolean;
}

export interface EventDeleteResult {
  deleted: DeletedEventDetail[];
  skipped: EventDeleteRefusal[];
  /** Ids that name no event (already gone, or never existed). */
  missing: string[];
}

/** One grouped count per event id, over the ids given. */
const countsById = (rows: { eventId: string; total: number }[]) =>
  new Map(rows.map((row) => [row.eventId, row.total]));

/**
 * Delete each of `ids` the guard allows and report the rest. Run it inside a
 * transaction.
 *
 * Crawled rows are never locked: `manual` is set at insert and never changes
 * (migration 0115), so a plain read settles `not_manual` and the missing ids,
 * and the crawler's writers (the stale sweep, the upsert) never wait on an
 * admin delete. The manual rows are then locked FOR UPDATE in id order, and
 * their `user_events` rows after them, also in id order; the counts are read
 * under both locks.
 *
 * Lock order is events, then user_events. Two delete calls cannot deadlock
 * each other. Two paths take the other order and could, rarely: an admin
 * merge that locks two rows of the same batch, and a fan's "hide this
 * delisted show", which locks their user_events row and then inserts a
 * dismissal keyed on the event. Postgres aborts one side with a deadlock
 * error: the request 500s and nothing is deleted.
 */
export const deleteManualEvents = async (
  tx: DbTransaction,
  ids: readonly string[],
): Promise<EventDeleteResult> => {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { deleted: [], skipped: [], missing: [] };

  const kinds = await tx
    .select({ id: events.id, manual: events.manual })
    .from(events)
    .where(inArray(events.id, unique));
  const skipped: EventDeleteRefusal[] = kinds
    .filter((row) => !row.manual)
    .map((row) => ({ id: row.id, reason: 'not_manual' as const }));
  const candidateIds = kinds.filter((row) => row.manual).map((row) => row.id);

  const locked =
    candidateIds.length === 0
      ? []
      : await tx
          .select({
            id: events.id,
            title: events.title,
            date: events.date,
            venueId: events.venueId,
            verified: events.verified,
          })
          .from(events)
          .where(and(inArray(events.id, candidateIds), eq(events.manual, true)))
          .orderBy(asc(events.id))
          .for('update');

  // A manual row deleted by another call since the read is missing too.
  const known = new Set([
    ...locked.map((row) => row.id),
    ...skipped.map((row) => row.id),
  ]);
  const missing = unique.filter((id) => !known.has(id));
  const manualIds = locked.map((row) => row.id);

  // A new user_events row waits on the event lock (its foreign key), but an
  // upsert that flips an existing row (Interested to Watching, or a Concert
  // added to it) keeps event_id and takes no lock on the event. Locking the
  // rows makes that flip wait for this transaction, or this count wait for
  // it to commit.
  if (manualIds.length > 0) {
    await tx
      .select({ id: userEvents.id })
      .from(userEvents)
      .where(inArray(userEvents.eventId, manualIds))
      .orderBy(asc(userEvents.id))
      .for('update');
  }

  // One query at a time: a transaction is one connection.
  const none = new Map<string, number>();
  const watchers =
    manualIds.length === 0
      ? none
      : countsById(
          await tx
            .select({ eventId: userEvents.eventId, total: count() })
            .from(userEvents)
            .where(
              and(
                inArray(userEvents.eventId, manualIds),
                eq(userEvents.status, 'watching'),
              ),
            )
            .groupBy(userEvents.eventId),
        );
  // Concerts as the app reads them: the fan's Concerts (routes/history.ts)
  // is `attending_at` set, whatever the status, and the admin went count
  // (event-counts.ts) is status `going`. A row that is both Watching and a
  // Concert counts in both.
  const concerts =
    manualIds.length === 0
      ? none
      : countsById(
          await tx
            .select({ eventId: userEvents.eventId, total: count() })
            .from(userEvents)
            .where(
              and(
                inArray(userEvents.eventId, manualIds),
                or(
                  eq(userEvents.status, 'going'),
                  isNotNull(userEvents.attendingAt),
                ),
              ),
            )
            .groupBy(userEvents.eventId),
        );
  const submittedPrices =
    manualIds.length === 0
      ? none
      : countsById(
          await tx
            .select({ eventId: priceSubmissions.eventId, total: count() })
            .from(priceSubmissions)
            .where(inArray(priceSubmissions.eventId, manualIds))
            .groupBy(priceSubmissions.eventId),
        );
  const redirects =
    manualIds.length === 0
      ? none
      : countsById(
          await tx
            .select({ eventId: eventRedirects.targetId, total: count() })
            .from(eventRedirects)
            .where(inArray(eventRedirects.targetId, manualIds))
            .groupBy(eventRedirects.targetId),
        );

  const allowed: typeof locked = [];
  for (const row of locked) {
    const counts: EventDependentCounts = {
      watchers: watchers.get(row.id) ?? 0,
      concerts: concerts.get(row.id) ?? 0,
      submittedPrices: submittedPrices.get(row.id) ?? 0,
      redirects: redirects.get(row.id) ?? 0,
    };
    if (Object.values(counts).some((total) => total > 0)) {
      skipped.push({ id: row.id, reason: 'has_dependents', counts });
      continue;
    }
    allowed.push(row);
  }

  if (allowed.length === 0) return { deleted: [], skipped, missing };

  const venueIds = [
    ...new Set(
      allowed.flatMap((row) => (row.venueId === null ? [] : [row.venueId])),
    ),
  ];
  const venueNames = new Map(
    venueIds.length === 0
      ? []
      : (
          await tx
            .select({ id: venues.id, name: venues.name })
            .from(venues)
            .where(inArray(venues.id, venueIds))
        ).map((venue) => [venue.id, venue.name]),
  );

  await tx.delete(events).where(
    inArray(
      events.id,
      allowed.map((row) => row.id),
    ),
  );

  return {
    deleted: allowed.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      venueId: row.venueId,
      venueName:
        row.venueId === null ? null : (venueNames.get(row.venueId) ?? null),
      wasVerified: row.verified,
    })),
    skipped,
    missing,
  };
};
