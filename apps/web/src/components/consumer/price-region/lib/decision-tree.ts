// decision-tree.ts — pure orchestrator helper for the price region on event
// detail. Reads aggregated event data and emits a tagged union; the renderer
// (EventDetailClient) does nothing more than render the appropriate card.
//
// Why this exists: EventDetailClient's EventDetailPriceBlock has ~600 lines
// of branching logic already; adding the 19 price-region states inline would
// push it past 1500. Extracting the decision keeps the renderer linear and
// makes the branching unit-testable in isolation.
//
// Cross-reference: docs/superpowers/design-tables/price-source-consumer-ui.md
// §8 (state coverage) and §9 (locked decisions).

import type {
  EventDetailResponse,
  TierAlternate,
  TierPriceBlock,
  TicketLink,
} from '@concert-crawl/types'

export type PriceRegionDecision =
  | { kind: 'noop' } // server-rendered PriceDisplay handles it
  | {
      kind: 'sold-out-resale'
      resaleLink: TicketLink
      faceValueResaleVendor: string
      faceValueResaleRange?: string
    }
  | { kind: 'sold-out-contribute' } // LOCKED §9 Q1
  | {
      kind: 'no-price-resale'
      resaleLink: TicketLink
      faceValueResaleVendor: string
    }
  | { kind: 'no-price-empty' } // LOCKED §9 Q2-eng
  | {
      // STATE #3 — at least one tier's headline is resale AND there is no
      // boxoffice/standard headline elsewhere. Render shipped MultiTierLiveCard
      // (with the new kind='resale' enum value) AND a show-level FaceValueCard
      // underneath inviting box-office contribution.
      kind: 'resale-headline'
      priceByTier: TierPriceBlock[]
      faceValueResaleVendor: string
    }
  | {
      kind: 'multi-source-mixed'
      entryBlock: TierPriceBlock
      crossSourceAlt: TierAlternate
      otherTiers: TierPriceBlock[]
    }
  | { kind: 'multi-tier-shipped'; priceByTier: TierPriceBlock[] }
  | { kind: 'legacy' } // priceByTier null → existing flat-field code path

export interface PriceRegionInput {
  event: Pick<
    EventDetailResponse,
    'priceByTier' | 'priceStatus' | 'status' | 'ticketLinks' | 'priceVendor'
  >
}

// NOTE: the original plan snippet also checked `event.status === 'soldout'`
// as a disjunct, but EventStatus is 'upcoming' | 'cancelled' | 'postponed'
// — soldout lives exclusively on `event.priceStatus`. The `status` field
// stays in the Pick for forward-compat (e.g. cancelled / postponed handling
// in a future iteration) but is not consulted for the soldout branch.
export function decidePriceRegion({
  event,
}: PriceRegionInput): PriceRegionDecision {
  const blocks = event.priceByTier ?? null

  // Sold-out priority — even when priceByTier exists, sold-out trumps.
  if (event.priceStatus === 'soldout') {
    const resaleLink =
      event.ticketLinks?.find((link) => link.kind === 'resale') ?? null
    if (resaleLink === null) {
      // LOCKED §9 Q1 — render ContributeFaceValueCard (single ghost box-office
      // row + signal CTA, no resale row, no outbound ProvenanceCTA) alongside
      // SoldOutPriceCard variant='no-listing'.
      return { kind: 'sold-out-contribute' }
    }
    return {
      kind: 'sold-out-resale',
      resaleLink,
      faceValueResaleVendor: resaleLink.vendor ?? 'Resale',
    }
  }

  // No priceByTier → defer to legacy flat-field logic in EventDetailClient.
  if (blocks === null || blocks.length === 0) {
    const resaleLink =
      event.ticketLinks?.find((link) => link.kind === 'resale') ?? null
    if (resaleLink !== null) {
      return {
        kind: 'no-price-resale',
        resaleLink,
        faceValueResaleVendor: resaleLink.vendor ?? 'Resale',
      }
    }
    // LOCKED §9 Q2-eng — no resale link AND no priceByTier. Fall through to
    // the existing community-handoff card (NoPriceCard). NO FaceValueCard —
    // pedagogy collapses without a resale anchor.
    return { kind: 'no-price-empty' }
  }

  // Multi-source mixed: the cheapest tier has BOTH a corroborated headline
  // AND a resale alternate in the same tier.
  const entryBlock = blocks[0]
  if (entryBlock?.headline) {
    const crossSourceAlt =
      entryBlock.alternates.find((alt) => alt.sourceCategory === 'resale') ??
      null
    if (
      crossSourceAlt !== null &&
      entryBlock.headline.sourceCategory === 'boxoffice'
    ) {
      return {
        kind: 'multi-source-mixed',
        entryBlock,
        crossSourceAlt,
        otherTiers: blocks.slice(1),
      }
    }
  }

  // STATE #3 — resale headline with no boxoffice/standard headline anywhere:
  // render shipped MultiTierLiveCard with kind='resale' AND a show-level
  // FaceValueCard inviting box-office contribution.
  const hasResaleHeadline = blocks.some(
    (block) => block.headline?.sourceCategory === 'resale',
  )
  const hasNonResaleHeadline = blocks.some(
    (block) =>
      block.headline !== null &&
      block.headline.sourceCategory !== null &&
      block.headline.sourceCategory !== 'resale',
  )
  if (hasResaleHeadline && !hasNonResaleHeadline) {
    const resaleBlock = blocks.find(
      (block) => block.headline?.sourceCategory === 'resale',
    )
    return {
      kind: 'resale-headline',
      priceByTier: blocks,
      faceValueResaleVendor: resaleBlock?.headline?.vendor ?? 'Resale',
    }
  }

  // Default — let MultiTierLiveCard / MixedTierCard / TwoPendingStack handle it.
  return { kind: 'multi-tier-shipped', priceByTier: blocks }
}
