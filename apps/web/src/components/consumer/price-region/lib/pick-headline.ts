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
}

function adaptBlock(block: TierPriceBlock): BrowseHeadline | null {
  if (block.headline === null) return null
  return {
    price: parseFloat(block.headline.priceMin),
    sourceCategory: block.headline.sourceCategory,
    observedAt: block.headline.observedAt,
  }
}

// Pick the cheapest tier with any price data.
// Relies on aggregateByTier sorting priceByTier[] by entry price ASC, so the
// first block with a non-null headline IS the cheapest with a price. If every
// tier is pending-only (all headlines null), return null (no chip data).
export function pickBrowseHeadline(
  priceByTier: ReadonlyArray<TierPriceBlock> | null | undefined,
): BrowseHeadline | null {
  if (priceByTier == null || priceByTier.length === 0) return null
  for (const block of priceByTier) {
    const headline = adaptBlock(block)
    if (headline !== null) return headline
  }
  return null
}
