import type { VenueDeleteBlockers } from '@concert-crawl/types';

/**
 * What a guarded delete came back with (`DELETE /v1/admin/venues/:id`). On
 * success, `eventsDetached` is the shows that slipped in since the guard's
 * count and were kept, unlinked (0 when the venue was already gone).
 */
export type DeleteVenueOutcome =
  | { ok: true; eventsDetached: number }
  | { ok: false; refused: VenueDeleteBlockers | null };

/** The DELETE route's own 404 message for a venue that isn't there. */
export const VENUE_NOT_FOUND = 'Venue not found';

/**
 * A 404 from the route itself, saying the venue is gone. A 404 with any other
 * body (a missing route, version skew) is a failure, not a finished delete.
 */
export const isVenueNotFound = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  Reflect.get(body, 'error') === VENUE_NOT_FOUND;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * The delete guard's 409 body (`{code: 'has_history', pastShows,
 * upcomingShows, watchers}`) narrowed to its counts, or null when it doesn't
 * carry all three.
 */
export const deleteBlockersOf = (body: unknown): VenueDeleteBlockers | null => {
  if (typeof body !== 'object' || body === null) return null;
  const pastShows: unknown = Reflect.get(body, 'pastShows');
  const upcomingShows: unknown = Reflect.get(body, 'upcomingShows');
  const watchers: unknown = Reflect.get(body, 'watchers');
  return isCount(pastShows) && isCount(upcomingShows) && isCount(watchers)
    ? { pastShows, upcomingShows, watchers }
    : null;
};

/** Any count above zero refuses the delete (the API's guard). */
export const deleteRefused = (
  blockers: VenueDeleteBlockers | null | undefined,
): blockers is VenueDeleteBlockers =>
  blockers !== null &&
  blockers !== undefined &&
  (blockers.pastShows > 0 ||
    blockers.upcomingShows > 0 ||
    blockers.watchers > 0);
