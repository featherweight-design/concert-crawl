// What hiding and deleting a venue need to know (redesign 3a): why a venue is
// hidden, and how much it would lose if it were deleted.

import { and, count, countDistinct, eq, gte, lt, sql } from 'drizzle-orm';
import { db, events, userEvents } from '@concert-crawl/db';
import { todayInDenver } from '../../../lib/time.js';

/** Why an admin hid a venue (the drawn Hide dialog's WHY list). */
export const HIDE_REASONS = [
  'venue_closed',
  'not_music_venue',
  'other',
] as const;
export type HideReason = (typeof HIDE_REASONS)[number];

/**
 * The refusal every ordinary admin action gives a removed venue (removed_at
 * set by POST /v1/admin/venues/:id/remove: the venue asked us to remove its
 * data). Showing it again, resuming its crawl, queueing a crawl and probing its
 * source all answer 409 with this body, before any write and with no audit row.
 *
 * There is deliberately no way back from here. Restoring a removed venue needs
 * a deliberate, separately approved path of its own; it must never ride in on
 * Show, Resume or a crawl trigger.
 */
export const VENUE_REMOVED_ERROR =
  'This venue asked us to remove its data, so it stays off the site.';
export const VENUE_REMOVED_CODE = 'venue_removed';
export const venueRemovedBody = {
  success: false,
  error: VENUE_REMOVED_ERROR,
  code: VENUE_REMOVED_CODE,
} as const;

/** The database or a transaction on it, so a count can join a delete's lock. */
type Reader = Pick<typeof db, 'select'>;

/** A venue's shows on or after today, Mountain Time: the one upcoming rule. */
const upcomingOf = (venueId: string) =>
  and(eq(events.venueId, venueId), gte(events.date, todayInDenver()));

/** A venue's shows on or after today, Mountain Time. */
export const upcomingShowCount = async (
  venueId: string,
  reader: Reader = db,
): Promise<number> => {
  const [row] = await reader
    .select({ total: count(events.id) })
    .from(events)
    .where(upcomingOf(venueId));
  return row?.total ?? 0;
};

/**
 * The same upcoming shows split by whether fans see them, for the venue
 * Overview's Shows card. The two always add up to `upcomingShowCount`.
 */
export const upcomingShowSplit = async (
  venueId: string,
  reader: Reader = db,
): Promise<{ shown: number; hidden: number }> => {
  const [row] = await reader
    .select({
      shown: sql<number>`count(*) filter (where not ${events.hiddenFromConsumer})::int`,
      hidden: sql<number>`count(*) filter (where ${events.hiddenFromConsumer})::int`,
    })
    .from(events)
    .where(upcomingOf(venueId));
  return { shown: row?.shown ?? 0, hidden: row?.hidden ?? 0 };
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
): Promise<DeleteBlockers> => ({
  ...(await pastShowsAndWatchers(venueId, reader)),
  upcomingShows: await upcomingShowCount(venueId, reader),
});

/**
 * The delete blockers other than the upcoming count, for a caller that already
 * has that count (the venue detail takes it from `upcomingShowSplit`).
 */
export const pastShowsAndWatchers = async (
  venueId: string,
  reader: Reader = db,
): Promise<Omit<DeleteBlockers, 'upcomingShows'>> => {
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
  return { pastShows: past?.total ?? 0, watchers: watchers?.total ?? 0 };
};
