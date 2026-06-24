import type {
  HowFound,
  SourceCategory,
  Tier,
  TierAlternate,
  TierCounter,
  TierHeadline,
  TierPending,
  TierPriceBlock,
  Vendor,
} from '@concert-crawl/types'
import {
  compareTierRows,
  pickTierHeadline,
  type TierRow,
} from './pick-tier-headline.js'
import { narrowLastAdminAction } from '../last-admin-action.js'

export interface CorroboratedTierRow extends TierRow {
  tier: Tier
  confirmsCount: number
}

export interface PendingTierRow {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  howFound: HowFound
  note: string | null
  userId: string | null
  tier: Tier
  createdAt: Date
  confirmsCount: number
}

export interface CounterTierRow {
  id: string
  parentSubmissionId: string
  tier: Tier
  priceMin: string
  priceMax: string | null
  userId: string | null
  createdAt: Date
  // Engagement-signal columns carried straight off the counter's
  // price_submissions row. The consumer event-detail surface renders a
  // quiet pill on the counter card when lastAdminActionKind === 'defer'.
  // `string | null` (not the narrow union) because Drizzle returns the raw
  // text column — buildCounter narrows to the API shape.
  lastAdminActionAt: Date | null
  lastAdminActionKind: string | null
}

export interface AggregateByTierInput {
  corroborated: readonly CorroboratedTierRow[]
  pending: readonly PendingTierRow[]
  // Sorted newest-first (createdAt descending). The composer's find() picks
  // the first matching counter for each headline, so the caller's ordering
  // determines which dispute wins when multiple challenge the same row.
  counters: readonly CounterTierRow[]
  handles: ReadonlyMap<string, string>
  reportsByTier: ReadonlyMap<Tier, number>
  confirmsNeeded: number
  viewerUserId: string | null
}

function groupByTier<RowType extends { tier: Tier }>(
  rows: readonly RowType[],
): Map<Tier, RowType[]> {
  const map = new Map<Tier, RowType[]>()
  for (const row of rows) {
    const existing = map.get(row.tier)
    if (existing) {
      existing.push(row)
    } else {
      map.set(row.tier, [row])
    }
  }
  return map
}

// Pick the headline (top-trust row) for each tier present in the input.
// Exported so callers that need to know which corroborated rows are the
// per-tier headlines — e.g. to decide which pending counter actually
// attaches as counterSubmission — can use the same selection rule the
// composer uses internally. Keeps the headline pick canonical in one place.
//
// Generic over any row that carries `tier` plus the comparator's TierRow
// fields so callers can pass either the bare DB row shape (pre-confirms
// enrichment) or the full CorroboratedTierRow without an extra map step.
export function pickHeadlinesByTier<RowType extends TierRow & { tier: Tier }>(
  rows: readonly RowType[],
): Map<Tier, RowType> {
  const grouped = groupByTier(rows)
  const headlines = new Map<Tier, RowType>()
  for (const [tier, tierRows] of grouped) {
    const head = pickTierHeadline(tierRows)
    if (head !== null) headlines.set(tier, head)
  }
  return headlines
}

function buildHeadline(
  row: CorroboratedTierRow,
  handles: ReadonlyMap<string, string>,
): TierHeadline {
  return {
    submissionId: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    sourceCategory: row.sourceCategory,
    submitterHandle:
      row.userId !== null ? (handles.get(row.userId) ?? null) : null,
    observedAt: row.createdAt.toISOString(),
    approvedAt: row.updatedAt.toISOString(),
    approvalKind: row.confirmsCount > 0 ? 'fan' : 'admin',
    confirmsCount: row.confirmsCount,
  }
}

function buildAlternate(row: CorroboratedTierRow): TierAlternate {
  return {
    submissionId: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    sourceCategory: row.sourceCategory,
  }
}

function buildPending(
  row: PendingTierRow,
  handles: ReadonlyMap<string, string>,
  confirmsNeeded: number,
  viewerUserId: string | null,
): TierPending {
  return {
    id: row.id,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    vendor: row.vendor,
    howFound: row.howFound,
    sourceCategory: row.sourceCategory,
    note: row.note,
    submitterHandle:
      row.userId !== null ? (handles.get(row.userId) ?? null) : null,
    submittedAt: row.createdAt.toISOString(),
    confirmsCount: row.confirmsCount,
    confirmsNeeded,
    isSubmitter: row.userId !== null && row.userId === viewerUserId,
  }
}

function buildCounter(
  row: CounterTierRow,
  handles: ReadonlyMap<string, string>,
): TierCounter {
  const handle = row.userId !== null ? (handles.get(row.userId) ?? null) : null
  const ceiling = row.priceMax !== null ? parseFloat(row.priceMax) : null
  // Pair-narrow kind + at together so an unrecognized kind in the column
  // never leaves a half-populated pair (kind=null, at=<timestamp>) for
  // consumers. Shared helper in apps/api/src/lib/last-admin-action.ts —
  // same defensive treatment as the contest detail endpoint and the
  // counterSubmission projection in events.ts.
  const lastAction = narrowLastAdminAction(
    row.lastAdminActionKind,
    row.lastAdminActionAt,
  )
  return {
    id: row.id,
    parentSubmissionId: row.parentSubmissionId,
    floor: parseFloat(row.priceMin),
    ...(ceiling !== null ? { ceiling } : {}),
    submitter: handle !== null ? { handle } : null,
    submittedAt: row.createdAt.toISOString(),
    lastAdminActionAt: lastAction.at,
    lastAdminActionKind: lastAction.kind,
  }
}

// Pending order within a tier: VenueBoxOffice first, then newest first. Mirrors
// the existing handler's order so the consumer surface stays stable while PR 4
// migrates off the flat pendingSubmissions field.
function sortPending(rows: readonly PendingTierRow[]): PendingTierRow[] {
  return [...rows].sort((left, right) => {
    const leftBoxOffice = left.vendor === 'VenueBoxOffice' ? 0 : 1
    const rightBoxOffice = right.vendor === 'VenueBoxOffice' ? 0 : 1
    if (leftBoxOffice !== rightBoxOffice) return leftBoxOffice - rightBoxOffice
    return right.createdAt.getTime() - left.createdAt.getTime()
  })
}

// Min priceMin across a tier's pending rows. pending[] is sorted for display
// (VenueBoxOffice-first, newest-first), so pending[0] is NOT guaranteed to be
// the cheapest — we have to scan.
function minPendingPrice(pending: readonly TierPending[]): number {
  let min = Number.POSITIVE_INFINITY
  for (const row of pending) {
    const value = parseFloat(row.priceMin)
    if (value < min) min = value
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min
}

// Tier display order: tiers with a corroborated headline first (sorted by
// cheapest headline), then pending-only tiers (sorted by cheapest pending).
// Tiers with no submissions at all are omitted by construction (only tiers
// surfaced in the union of corroborated + pending groups produce blocks).
function compareBlocks(left: TierPriceBlock, right: TierPriceBlock): number {
  const leftHead = left.headline
  const rightHead = right.headline
  if (leftHead !== null && rightHead !== null) {
    return parseFloat(leftHead.priceMin) - parseFloat(rightHead.priceMin)
  }
  if (leftHead !== null) return -1
  if (rightHead !== null) return 1
  return minPendingPrice(left.pending) - minPendingPrice(right.pending)
}

export function aggregateByTier(input: AggregateByTierInput): TierPriceBlock[] {
  const {
    corroborated,
    pending,
    counters,
    handles,
    reportsByTier,
    confirmsNeeded,
    viewerUserId,
  } = input

  const corrobByTier = groupByTier(corroborated)
  const pendingByTier = groupByTier(pending)

  const allTiers = new Set<Tier>()
  for (const tier of corrobByTier.keys()) allTiers.add(tier)
  for (const tier of pendingByTier.keys()) allTiers.add(tier)

  const blocks: TierPriceBlock[] = []
  for (const tier of allTiers) {
    const corrobRows = corrobByTier.get(tier) ?? []
    const pendingRows = pendingByTier.get(tier) ?? []

    // Sort once and slice — the head and alternates share the same ordering
    // so the API response is fully deterministic regardless of DB row order.
    const sortedCorrob = [...corrobRows].sort(compareTierRows)
    const head = sortedCorrob[0] ?? null
    const headline = head !== null ? buildHeadline(head, handles) : null
    const alternates = sortedCorrob.slice(1).map(buildAlternate)

    // Counters input is contract-required to be sorted newest-first by the
    // caller so find() returns the most recent challenger deterministically
    // when multiple disputes exist against the same headline. See the
    // AggregateByTierInput.counters doc comment.
    const counter =
      head !== null
        ? counters.find(
            (row) => row.tier === tier && row.parentSubmissionId === head.id,
          )
        : undefined

    blocks.push({
      tier,
      headline,
      alternates,
      pending: sortPending(pendingRows).map((row) =>
        buildPending(row, handles, confirmsNeeded, viewerUserId),
      ),
      counterSubmission:
        counter !== undefined ? buildCounter(counter, handles) : null,
      reports: reportsByTier.get(tier) ?? 0,
    })
  }

  return blocks.sort(compareBlocks)
}
