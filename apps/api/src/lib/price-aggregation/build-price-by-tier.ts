import {
  SP_POLICY,
  deriveSourceCategory,
  type HowFound,
  type SourceCategory,
  type Tier,
  type TierHeadline,
  type TierPriceBlock,
  type Vendor,
} from '@concert-crawl/types'
import { aggregateByTier } from './aggregate-by-tier.js'

export interface CorroboratedSubmissionRow {
  id: string
  eventId: string
  tier: Tier
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  howFound: HowFound
  userId: string | null
  createdAt: Date
  updatedAt: Date
  corroborationCount: number
}

/**
 * Aggregate corroborated submissions into per-event `priceByTier` blocks.
 *
 * `headline` and `alternates` come from the corroborated rows. Everything the
 * per-event side tables feed — pending rows, counters, submitter handles,
 * reports — is left at its empty default, because those are the expensive
 * fetches `/v1/events/:id` runs and no list surface reads them. Callers needing
 * the rich payload should keep using the detail endpoint.
 */
export function buildPriceByTierMap(
  rows: CorroboratedSubmissionRow[],
): Map<string, TierPriceBlock[]> {
  const byEvent = new Map<string, CorroboratedSubmissionRow[]>()
  for (const sub of rows) {
    const existing = byEvent.get(sub.eventId)
    if (existing) existing.push(sub)
    else byEvent.set(sub.eventId, [sub])
  }

  const result = new Map<string, TierPriceBlock[]>()
  for (const [eventId, subs] of byEvent) {
    result.set(
      eventId,
      aggregateByTier({
        corroborated: subs.map((sub) => ({
          id: sub.id,
          tier: sub.tier,
          priceMin: sub.priceMin,
          priceMax: sub.priceMax,
          vendor: sub.vendor,
          // Corroborated rows written before the sourceCategory column existed
          // carry null; inferring keeps a box-office row from being labelled
          // 'standard', which would demote it in the trust ranking.
          sourceCategory:
            sub.sourceCategory ??
            deriveSourceCategory(sub.vendor, sub.howFound),
          userId: sub.userId,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
          // The submitter counts as observation #1 per the
          // price_submissions.corroboration_count schema comment, so the count
          // we surface excludes them. Without this every row computes
          // approvalKind='admin'.
          confirmsCount: Math.max(0, sub.corroborationCount - 1),
        })),
        pending: [],
        counters: [],
        handles: new Map(),
        reportsByTier: new Map(),
        confirmsNeeded: SP_POLICY.confirmsRequired,
        viewerUserId: null,
      }),
    )
  }
  return result
}

/**
 * `lowestHeadlinePrice` in the string form the numeric columns use, falling
 * back to the `events.ticketPriceMin` scalar for crawler-sourced prices, which
 * have no corroborated submissions to aggregate. This is the same precedence
 * Browse applies.
 */
export function resolveDisplayPrice(
  blocks: TierPriceBlock[],
  fallbackScalar: string | null,
): string | null {
  const lowest = lowestHeadlinePrice(blocks)
  return lowest !== null ? lowest.toFixed(2) : fallbackScalar
}

/**
 * The price a list surface shows: the floor of the cheapest tier.
 *
 * Read this instead of `events.ticketPriceMin` — that column is a denormalized
 * scalar holding whatever price was written last, which is not necessarily the
 * cheapest tier (#1365). `aggregateByTier` sorts blocks by headline price
 * ascending, so the answer is the first block carrying a headline.
 */
export function lowestHeadlinePrice(blocks: TierPriceBlock[]): number | null {
  const headline = lowestHeadline(blocks)
  return headline === null ? null : parseFloat(headline.priceMin)
}

/**
 * When the price a list surface shows was last observed, for the staleness
 * marker (#1366). Null for crawler-sourced prices, which have no submission to
 * read a timestamp from.
 */
export function lowestHeadlineObservedAt(
  blocks: TierPriceBlock[],
): string | null {
  return lowestHeadline(blocks)?.observedAt ?? null
}

function lowestHeadline(blocks: TierPriceBlock[]): TierHeadline | null {
  for (const block of blocks) {
    if (
      block.headline != null &&
      Number.isFinite(parseFloat(block.headline.priceMin))
    ) {
      return block.headline
    }
  }
  return null
}
