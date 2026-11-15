// The admin event delete guard (E5-a, plan 4b#10). A delete is a hard delete
// and every row that names the event cascades with it, so it is allowed only
// where nothing is lost:
//
// - Only a manual row (`events.manual`, a show an admin added). A crawled row
//   would come back on the next crawl with fresh ids and nobody on it, so it
//   is refused `not_manual`; Hide is the tool for those.
// - Only a row nobody depends on. Watchers (`user_events` with status
//   `watching`), Submitted prices (`price_submissions`, any status) and
//   incoming `event_redirects` (a merged-away listing that now resolves here)
//   all cascade on delete, so any of them refuses `has_dependents` with the
//   counts.
//
// Check and delete run in the caller's transaction, after `SELECT ... FOR
// UPDATE` on the events, and the counts are read under that lock. A new
// Watcher, submission or redirect inserts a row whose foreign key takes a
// KEY SHARE lock on the event, which waits on ours, so nothing can attach
// between the count and the delete.

import { and, asc, count, eq, inArray } from 'drizzle-orm';
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
 * transaction: the events are locked in id order (so two overlapping calls
 * cannot deadlock), counted, and the allowed ones deleted.
 */
export const deleteManualEvents = async (
  tx: DbTransaction,
  ids: readonly string[],
): Promise<EventDeleteResult> => {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { deleted: [], skipped: [], missing: [] };

  const locked = await tx
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      venueId: events.venueId,
      manual: events.manual,
      verified: events.verified,
    })
    .from(events)
    .where(inArray(events.id, unique))
    .orderBy(asc(events.id))
    .for('update');

  const found = new Set(locked.map((row) => row.id));
  const missing = unique.filter((id) => !found.has(id));
  const manualIds = locked.filter((row) => row.manual).map((row) => row.id);

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

  const skipped: EventDeleteRefusal[] = [];
  const allowed: typeof locked = [];
  for (const row of locked) {
    if (!row.manual) {
      skipped.push({ id: row.id, reason: 'not_manual' });
      continue;
    }
    const counts: EventDependentCounts = {
      watchers: watchers.get(row.id) ?? 0,
      submittedPrices: submittedPrices.get(row.id) ?? 0,
      redirects: redirects.get(row.id) ?? 0,
    };
    if (counts.watchers + counts.submittedPrices + counts.redirects > 0) {
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
