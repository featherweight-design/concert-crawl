// pick-headline.ts — consumer-side adapter over the API-side aggregation.
//
// IMPORTANT: this helper does NOT re-implement trust ordering or tie-break.
// Those decisions are owned by the API's pick-tier-headline.ts; by the time
// the consumer sees `priceByTier`, each block already has a single pre-picked
// `headline` (or null) and the blocks are sorted by entry price ascending.
//
// This helper's job is to pick the FIRST block with a non-null headline —
// which is the cheapest tier with any price data, per API sort order. If the
// API guarantees change, this helper must change with them.
//
// `sourceCategory` passes through untranslated. An earlier `kindFromCategory`
// renamed `standard` to `community` here, which put a second provenance
// vocabulary one function away from the first; the row owns the labels now.
//
// Cross-reference: apps/api/src/lib/price-aggregation/pick-tier-headline.ts.

import type { TierPriceBlock, SourceCategory } from '@concert-crawl/types'

export interface BrowseHeadline {
  price: number
  /** null is a crawled price with no corroborated submission. */
  sourceCategory: SourceCategory | null
  observedAt: string
  /**
   * True when no tier had an approved headline and this price came from a
   * submission still awaiting corroboration. The row must mark it, because an
   * unconfirmed price rendered bare is indistinguishable from a confirmed one.
   */
  isPending: boolean
}

function adaptBlock(block: TierPriceBlock): BrowseHeadline | null {
  if (block.headline === null) return null
  return {
    price: parseFloat(block.headline.priceMin),
    sourceCategory: block.headline.sourceCategory,
    observedAt: block.headline.observedAt,
    isPending: false,
  }
}

// Cheapest pending submission in a block. `pending[]` arrives ordered by
// recency, not by price, so this cannot take the first entry the way the
// headline path takes the first block.
function adaptPending(block: TierPriceBlock): BrowseHeadline | null {
  let cheapest: BrowseHeadline | null = null
  for (const entry of block.pending) {
    const price = parseFloat(entry.priceMin)
    if (!Number.isFinite(price)) continue
    if (cheapest === null || price < cheapest.price) {
      cheapest = {
        price,
        sourceCategory: entry.sourceCategory,
        observedAt: entry.submittedAt,
        isPending: true,
      }
    }
  }
  return cheapest
}

// Pick the cheapest tier with any price data.
// Relies on aggregateByTier sorting priceByTier[] by entry price ASC, so the
// first block with a non-null headline IS the cheapest with a price.
//
// An approved headline always outranks a pending submission, at any tier — a
// corroborated price is the better answer even when an unconfirmed one is
// cheaper. Only when no tier has a headline at all does the pending pass run,
// because "we have a number, nobody has confirmed it" beats showing "tba" and
// letting the reader assume we know nothing.
export function pickBrowseHeadline(
  priceByTier: ReadonlyArray<TierPriceBlock> | null | undefined,
): BrowseHeadline | null {
  if (priceByTier == null || priceByTier.length === 0) return null
  for (const block of priceByTier) {
    const headline = adaptBlock(block)
    if (headline !== null) return headline
  }
  for (const block of priceByTier) {
    const pending = adaptPending(block)
    if (pending !== null) return pending
  }
  return null
}
