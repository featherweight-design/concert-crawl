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

// PriceRegionDecision enumerates ONLY the kinds `decidePriceRegion` actually
// returns today. The orchestrator falls through to its existing legacy
// branches whenever none of these match — there's no explicit `'noop'` or
// `'legacy'` kind because the orchestrator already encodes the "no
// priceByTier handling, run the legacy if-tree" case as the absence of a
// decision-tree match.
export type PriceRegionDecision =
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
  | {
      // STATE #6 — at least one tier has a corroborated headline AND at least
      // one other tier has NO headline but pending submissions. MixedTierCard
      // handles the per-tier pending tells (shipped from prior cycle).
      kind: 'mixed-tier'
      priceByTier: TierPriceBlock[]
    }
  | {
      // STATE #7 — every tier is pending-only (no headlines anywhere) AND at
      // least one tier has pending submissions. Renders the focused
      // PendingStack — each block contributes its first pending row.
      kind: 'all-tiers-pending'
      priceByTier: TierPriceBlock[]
    }
  | { kind: 'multi-tier-shipped'; priceByTier: TierPriceBlock[] }

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
  //
  // Important — the API treats sourceCategory === null as 'standard' (see
  // apps/api/src/lib/price-aggregation/pick-tier-headline.ts:16-21), so a
  // legacy null-category headline IS a non-resale headline for routing
  // purposes. Treating it otherwise would push events with real
  // boxoffice/standard prices into the face-value-pedagogy state.
  const hasResaleHeadline = blocks.some(
    (block) => block.headline?.sourceCategory === 'resale',
  )
  const hasNonResaleHeadline = blocks.some(
    (block) =>
      block.headline !== null && block.headline.sourceCategory !== 'resale',
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

  // STATE #7 — all tiers pending. Every block has no headline AND at least
  // one block has pending rows. Routes to PendingStack via the renderer.
  // Checked BEFORE mixed-tier because the all-pending case is a strict subset
  // of "any-pending" — mixed-tier requires at least one headline to exist.
  const anyHeadline = blocks.some((block) => block.headline !== null)
  const anyPending = blocks.some((block) => block.pending.length > 0)
  if (!anyHeadline && anyPending) {
    return { kind: 'all-tiers-pending', priceByTier: blocks }
  }

  // STATE #6 — mixed-tier: at least one tier has a headline AND at least one
  // OTHER tier is pending-only (no headline + pending.length > 0). The
  // headline tier may also have pending submissions in flight — that's
  // common when new corroborations are arriving — and shouldn't disqualify
  // it. MixedTierCard handles this case natively (shipped per-tier pending
  // tells), where multi-tier-shipped would render the pending-only tier as
  // a muted $0.
  const anyHeadlineTier = blocks.some((block) => block.headline !== null)
  const anyPendingOnlyTier = blocks.some(
    (block) => block.headline === null && block.pending.length > 0,
  )
  if (anyHeadlineTier && anyPendingOnlyTier) {
    return { kind: 'mixed-tier', priceByTier: blocks }
  }

  // Default — let MultiTierLiveCard handle it (multi-headline cases, single-
  // tier cases, etc.). MixedTierCard / PendingStack now have their own
  // explicit branches above; this branch is the simple "all tiers have a
  // headline" path.
  return { kind: 'multi-tier-shipped', priceByTier: blocks }
}
