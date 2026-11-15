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
 * The same rule as `moveEventVenue`: past, and not postponed.
 */
export const venueEditable = (detail: EventDetail, today: string): boolean =>
  detail.venueId !== null &&
  (detail.manual ||
    (isPast(detail, today) && !isPostponedPassed(detail, today)));

/**
 * The move tells the Watching: a show still to come (a played one is a
 * silent correction), not cancelled (the API tells nobody then), with
 * someone Watching. Only then does Save confirm first.
 */
export const moveTellsWatchers = (
  detail: EventDetail,
  today: string,
): boolean =>
  !(isPast(detail, today) && !isPostponedPassed(detail, today)) &&
  detail.status !== 'cancelled' &&
  detail.watchingCount > 0;

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
