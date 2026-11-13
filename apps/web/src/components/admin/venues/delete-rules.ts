import type { VenueDeleteBlockers } from '@concert-crawl/types';

/** What a guarded delete came back with (`DELETE /v1/admin/venues/:id`). */
export type DeleteVenueOutcome =
  { ok: true } | { ok: false; refused: VenueDeleteBlockers | null };

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
