import type { EventStatus } from '@concert-crawl/types';

/** The price's own state, which is a different axis from the lifecycle. */
export type RowPriceState = 'live' | 'soldout' | 'presale';

/**
 * What the price slot renders. Exactly one, always. `removed` is No longer
 * listed: a cancellation the stale sweep inferred from the venue page dropping
 * the show, not one anybody confirmed.
 */
export type RowStatus =
  'removed' | 'cancelled' | 'postponed' | 'soldout' | 'presale' | 'price';

/**
 * Whether a show is No longer listed rather than Cancelled. The sweep marks
 * its own cancellations with `delisted_at`, and a confirmed cancellation
 * clears it, so the marker only counts while the status is still `cancelled`.
 * This is the one place the web side asks the question (A5 plan: one
 * derivation per side).
 */
export function isDelisted(
  lifecycle: EventStatus,
  delistedAt: string | null | undefined,
): boolean {
  return lifecycle === 'cancelled' && delistedAt != null;
}

/**
 * The price slot's precedence: `removed > cancelled > postponed > soldout >
 * presale > price`. Resolved across both axes at once and returned as a single
 * outcome, because the two axes are independent — a show can be cancelled
 * *and* sold out, and the old sequence of early returns asked `soldout` first,
 * so that show read "Sold out" in production.
 *
 * `delistedAt` is optional so an older payload, which never sends it, reads as
 * not delisted.
 */
export function resolveRowStatus(
  lifecycle: EventStatus,
  priceState: RowPriceState,
  delistedAt?: string | null,
): RowStatus {
  if (isDelisted(lifecycle, delistedAt)) return 'removed';
  if (lifecycle === 'cancelled') return 'cancelled';
  if (lifecycle === 'postponed') return 'postponed';
  if (priceState === 'soldout') return 'soldout';
  if (priceState === 'presale') return 'presale';
  return 'price';
}

/**
 * Whether the headliner takes the strike (B+ rows board, more-st-rows). Only a
 * cancelled show: the night is off, so its title is struck and dimmed. The date
 * line is left alone, because striking it read as "the date changed", which is
 * the postponed story. Postponed is not struck at all: the show still happens,
 * and its pill already says the date moved. Sold out is not struck either; the
 * night it names is still going ahead. No longer listed is not struck: nothing
 * says the show is off.
 */
export function isStruck(status: RowStatus): boolean {
  return status === 'cancelled';
}

/** Whether the artwork dims. Every suppressed state, sold out included. */
export function isFaded(status: RowStatus): boolean {
  return status !== 'presale' && status !== 'price';
}
