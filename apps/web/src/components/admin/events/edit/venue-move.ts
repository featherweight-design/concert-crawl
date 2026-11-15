/**
 * Event edit's venue step: `POST /v1/admin/events/:id/venue` (E2-C). Its
 * refusals become sentences here (`duplicate_show`'s body checked with Zod),
 * so a caller never shows a raw code or trusts an unchecked shape.
 */
import { z } from 'zod';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ApiError } from '@/lib/api';
import { isPast, isPostponedPassed, type EventDetail } from './event-detail';

const COPY = ADMIN_COPY.eventEdit.venue;

/**
 * Whether the API takes a venue change on this show: a played one (a silent
 * correction, crawled or manual) or one added by hand. A crawled show still
 * to come, or postponed, is its venue's calendar's (409 `crawled_show`).
 * The same rule as `moveEventVenue`: past, and not postponed. A show with no
 * venue (its venue was removed) can get one the same way.
 */
export const venueEditable = (detail: EventDetail, today: string): boolean =>
  detail.manual || (isPast(detail, today) && !isPostponedPassed(detail, today));

/** The show as the venue step finds it, after the same Save's PATCH. */
export interface AfterPatch {
  /** The drafted date (`YYYY-MM-DD`), which the PATCH writes first. */
  date: string;
  /**
   * The sale pills leave Postponed, Cancelled or No longer listed: the PATCH
   * sends `status: 'upcoming'`, so the show is back on.
   */
  reopened: boolean;
}

/**
 * The move tells the Watching, read as `moveEventVenue` reads the row once
 * the PATCH has run: not a correction (dated before today and not
 * postponed), not cancelled (the API tells nobody then), and someone
 * Watching. Only then does Save confirm first. So a cancelled show put back
 * on sale in the same Save confirms, and a show dated into the past doesn't.
 */
export const moveTellsWatchers = (
  detail: EventDetail,
  today: string,
  after: AfterPatch,
): boolean => {
  const status = after.reopened ? 'available' : detail.status;
  const corrected = after.date < today && status !== 'postponed';
  return !corrected && status !== 'cancelled' && detail.watchingCount > 0;
};

/** A refusal the toast says as such: a retry would be refused again. */
export interface VenueRefusal {
  message: string;
  /** `duplicate_show`'s other listing, which the toast links to. */
  existingId: string | null;
}

const duplicateBodySchema = z.object({ existingId: z.string().nullable() });

/** The POST's refusals, or null for any other failure. */
export const venueRefusalOf = (err: unknown): VenueRefusal | null => {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 409 && err.message === 'duplicate_show') {
    const body = duplicateBodySchema.safeParse(err.body);
    return {
      message: COPY.duplicate,
      existingId: body.success ? body.data.existingId : null,
    };
  }
  if (err.status === 409 && err.message === 'crawled_show') {
    return { message: COPY.crawled, existingId: null };
  }
  if (err.status === 400 && err.message === 'venue_not_found') {
    return { message: COPY.notFound, existingId: null };
  }
  return null;
};
