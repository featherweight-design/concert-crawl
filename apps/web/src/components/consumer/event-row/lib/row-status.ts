import type { EventStatus } from '@concert-crawl/types'

/** The price's own state, which is a different axis from the lifecycle. */
export type RowPriceState = 'live' | 'soldout' | 'presale'

/** What the price slot renders. Exactly one, always. */
export type RowStatus =
  'cancelled' | 'postponed' | 'soldout' | 'presale' | 'price'

/**
 * The price slot's precedence: `cancelled > postponed > soldout > presale >
 * price`. Resolved across both axes at once and returned as a single outcome,
 * because the two axes are independent — a show can be cancelled *and* sold
 * out, and the old sequence of early returns asked `soldout` first, so that
 * show read "Sold out" in production.
 */
export function resolveRowStatus(
  lifecycle: EventStatus,
  priceState: RowPriceState,
): RowStatus {
  if (lifecycle === 'cancelled') return 'cancelled'
  if (lifecycle === 'postponed') return 'postponed'
  if (priceState === 'soldout') return 'soldout'
  if (priceState === 'presale') return 'presale'
  return 'price'
}

/**
 * Whether line 3 takes the strike. Sold out is deliberately excluded: it shares
 * the dimmed artwork, but the date and time it names are still going to happen.
 */
export function isStruck(status: RowStatus): boolean {
  return status === 'cancelled' || status === 'postponed'
}
