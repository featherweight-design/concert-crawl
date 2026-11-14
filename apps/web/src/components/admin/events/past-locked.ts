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
