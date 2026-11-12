import type { EventStatusSource } from '@concert-crawl/types';

/**
 * Where an event's cancelled or postponed status was written, read off what
 * the rows can tell apart. The writers of those statuses are exhaustive:
 *
 * - the stale sweep sets `status = 'cancelled'` AND `delisted_at`; every other
 *   status write clears `delisted_at`, so a set `delisted_at` means 'sweep';
 * - a promoted fan report (the confirm threshold, or an admin resolving a
 *   report as promoted) leaves a promoted `event_reports` row, which an admin
 *   edit retires when it moves the show off that status: 'report';
 * - an admin edit (PATCH /v1/admin/events/:id, including the triage answers
 *   that call it) is the only remaining writer: 'admin'.
 *
 * 'crawler' is never returned: the crawler writes no cancelled or postponed
 * status (it inserts 'upcoming' and never touches a cancelled row). An upcoming
 * show has no source: null.
 *
 * Limits of the data, on purpose not papered over:
 * - 'admin' is inferred by elimination. No column records who wrote the status
 *   (no status_set_by), so a write by a path this note does not know would also
 *   read as 'admin'.
 * - An admin resolving a fan report as promoted leaves the same promoted row as
 *   a fan-confirmed one, so both read 'report'.
 */
export function deriveStatusSource(input: {
  status: string;
  delistedAt: Date | null;
  hasPromotedReport: boolean;
}): EventStatusSource | null {
  if (input.status !== 'cancelled' && input.status !== 'postponed') {
    return null;
  }
  if (input.delistedAt !== null) return 'sweep';
  if (input.hasPromotedReport) return 'report';
  return 'admin';
}
