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
 * The sentence for POST /v1/admin/events/:id/sold-out's 409 `not_on_sale`
 * (a cancelled, postponed or delisted show), or null for any other failure.
 */
export const notOnSaleMessage = (err: unknown): string | null => {
  if (
    !(err instanceof ApiError) ||
    err.status !== 409 ||
    err.message !== 'not_on_sale'
  ) {
    return null;
  }
  const copy = ADMIN_COPY.events.errors.notOnSale;
  if (err.reason === 'cancelled') return copy.cancelled;
  if (err.reason === 'postponed') return copy.postponed;
  if (err.reason === 'delisted') return copy.delisted;
  return copy.fallback;
};

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
