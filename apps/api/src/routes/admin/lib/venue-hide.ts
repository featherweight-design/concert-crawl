// What hiding and deleting a venue need to know (redesign 3a): why a venue is
// hidden, and how much it would lose if it were deleted.

import { and, count, countDistinct, eq, gte, lt } from 'drizzle-orm';
import { db, events, userEvents } from '@concert-crawl/db';
import { todayInDenver } from '../../../lib/time.js';

/** Why an admin hid a venue (the drawn Hide dialog's WHY list). */
export const HIDE_REASONS = [
  'venue_closed',
  'not_music_venue',
  'other',
] as const;
export type HideReason = (typeof HIDE_REASONS)[number];

/** The database or a transaction on it, so a count can join a delete's lock. */
type Reader = Pick<typeof db, 'select'>;

/** A venue's shows on or after today, Mountain Time. */
export const upcomingShowCount = async (
  venueId: string,
  reader: Reader = db,
): Promise<number> => {
  const [row] = await reader
    .select({ total: count(events.id) })
    .from(events)
    .where(and(eq(events.venueId, venueId), gte(events.date, todayInDenver())));
  return row?.total ?? 0;
};

export interface DeleteBlockers {
  /** Shows before today. */
  pastShows: number;
  /** Shows today or later. */
  upcomingShows: number;
  /** People with at least one of its shows on their Watching list. */
  watchers: number;
}

/**
 * What a hard delete would destroy. Any of these above zero refuses the delete
 * (a 409 carrying this), so a venue with history stays hidden instead.
 */
export const deleteBlockers = async (
  venueId: string,
  reader: Reader = db,
): Promise<DeleteBlockers> => {
  const today = todayInDenver();
  const [past] = await reader
    .select({ total: count(events.id) })
    .from(events)
    .where(and(eq(events.venueId, venueId), lt(events.date, today)));
  const [watchers] = await reader
    .select({ total: countDistinct(userEvents.userId) })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .where(and(eq(events.venueId, venueId), eq(userEvents.status, 'watching')));
  return {
    pastShows: past?.total ?? 0,
    upcomingShows: await upcomingShowCount(venueId, reader),
    watchers: watchers?.total ?? 0,
  };
};
