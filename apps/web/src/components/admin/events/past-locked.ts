import { ApiError } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * The sentence for PATCH /v1/admin/events/:id's 409 `past_locked`, or null
 * for any other failure, so a caller never shows the raw code.
 */
export const pastLockedMessage = (err: unknown): string | null =>
  err instanceof ApiError && err.status === 409 && err.message === 'past_locked'
    ? ADMIN_COPY.events.errors.pastLocked
    : null;

/**
 * The sentence for the same PATCH's 409 `duplicate_show` (a date or time
 * change that lands on another listing's night at the venue), or null for any
 * other failure.
 */
export const duplicateShowMessage = (err: unknown): string | null =>
  err instanceof ApiError &&
  err.status === 409 &&
  err.message === 'duplicate_show'
    ? ADMIN_COPY.events.errors.duplicateShow
    : null;
