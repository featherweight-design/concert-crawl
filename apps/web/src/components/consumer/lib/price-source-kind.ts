// price-source-kind.ts — resolves which trust mark a price card renders.
//
// Two orthogonal axes get conflated easily here:
//   - PriceSource     — where the data came from (crawl vs. community)
//   - SourceCategory  — the submitter's "Where's the price from?" answer
//                       (box office / standard ticket / resale)
//
// The mark reflects the SECOND. Deriving it from the vendor string instead is
// the bug this module exists to prevent: a vendor name never carried the
// resale-vs-primary meaning, so a fan-submitted resale price rendered as
// "Community" and every vendor outside the original six did too.

import type { PriceSource, SourceCategory } from '@concert-crawl/types'

export type SourceKind = 'primary' | 'resale' | 'community' | 'boxoffice'

// Legacy path only. Rows predating sourceCategory (#641) have nothing else to
// go on, so they keep the old vendor inference.
function kindFromVendor(
  vendor?: string | null,
): Exclude<SourceKind, 'primary'> {
  if (vendor === 'VenueBoxOffice') return 'boxoffice'
  if (vendor === 'SeatGeek') return 'resale'
  return 'community'
}

function kindFromSourceCategory(
  sourceCategory: SourceCategory | null | undefined,
  vendor?: string | null,
): Exclude<SourceKind, 'primary'> {
  switch (sourceCategory) {
    case 'boxoffice':
      return 'boxoffice'
    case 'resale':
      return 'resale'
    case 'standard':
      return 'community'
    default:
      return kindFromVendor(vendor)
  }
}

export function resolveSourceKind(
  source: PriceSource | null,
  vendor?: string | null,
  sourceCategory?: SourceCategory | null,
): SourceKind {
  if (source === 'community')
    return kindFromSourceCategory(sourceCategory, vendor)
  if (source === 'seatgeek') return 'resale'
  return 'primary'
}

export function resolveAlternateKind(
  vendor: string | null,
  sourceCategory?: SourceCategory | null,
): SourceKind {
  return kindFromSourceCategory(sourceCategory, vendor)
}
