import type { SourceCategory, Vendor } from '@concert-crawl/types'

export interface TierRow {
  id: string
  priceMin: string
  priceMax: string | null
  vendor: Vendor
  sourceCategory: SourceCategory | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}

// Trust order: boxoffice leads (face value, exempt from staleness per the
// price-transparency design), standard is the middle ground, resale is last.
// Null source_category is treated as standard so legacy rows don't get
// demoted below resale.
function trustRank(category: SourceCategory | null): number {
  if (category === 'boxoffice') return 0
  if (category === 'resale') return 2
  return 1
}

// Pick the leading row for a single tier. Sort order:
//   1. Source-category trust (boxoffice → standard → resale)
//   2. parseFloat(priceMin) ascending (cheapest face value wins ties within trust)
//   3. updatedAt descending (newest corroboration wins ties on price)
export function pickTierHeadline<TRow extends TierRow>(
  rows: readonly TRow[],
): TRow | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((left, right) => {
    const trustDelta =
      trustRank(left.sourceCategory) - trustRank(right.sourceCategory)
    if (trustDelta !== 0) return trustDelta
    const priceDelta = parseFloat(left.priceMin) - parseFloat(right.priceMin)
    if (priceDelta !== 0) return priceDelta
    return right.updatedAt.getTime() - left.updatedAt.getTime()
  })
  return sorted[0] ?? null
}
