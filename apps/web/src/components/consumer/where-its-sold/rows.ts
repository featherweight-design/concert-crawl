// rows.ts — which prices the "Where it's sold" card lists (B+ TS3,
// screens/06-states/bp-s-tiers_board, the VENDORS column).
//
// Every number here is one the API already resolved: the flat primary price
// (`priceSubmissionId`, looked up in `priceByTier` for its tier and amount)
// plus `priceAlternates`. Nothing reads the event row's denormalised
// `ticketPriceMin`, which holds whichever price was written last.

import type { EventDetailResponse, Tier } from '@concert-crawl/types';

export interface WhereItsSoldRow {
  /** The submission id: the row's key and its anchor on the price card. */
  id: string;
  vendor: string;
  tier: Tier;
  priceMin: string;
  priceMax: string | null;
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null;
}

export type WhereItsSoldEvent = Pick<
  EventDetailResponse,
  | 'status'
  | 'priceStatus'
  | 'priceSubmissionId'
  | 'priceAlternates'
  | 'priceByTier'
  | 'counterSubmission'
>;

/** The in-page anchor a row's › points at. */
export const priceAnchorId = (submissionId: string): string =>
  `price-${submissionId}`;

// The flat primary, read from the per-tier aggregation so its tier and
// amount are the ones the price card shows.
function findPrimary(event: WhereItsSoldEvent): WhereItsSoldRow | null {
  const primaryId = event.priceSubmissionId ?? null;
  if (primaryId === null) return null;
  for (const block of event.priceByTier ?? []) {
    const candidates = [
      ...(block.headline !== null ? [block.headline] : []),
      ...block.alternates,
    ];
    const match = candidates.find((row) => row.submissionId === primaryId);
    if (match !== undefined) {
      return {
        id: match.submissionId,
        vendor: match.vendor,
        tier: block.tier,
        priceMin: match.priceMin,
        priceMax: match.priceMax,
        sourceCategory: match.sourceCategory,
      };
    }
  }
  return null;
}

/**
 * The card's rows, in the API's trust order. Empty when the card should not show:
 * a sold-out or cancelled show, or fewer than two sellers (the price card
 * already names a lone seller).
 */
export function buildWhereItsSoldRows(
  event: WhereItsSoldEvent,
): WhereItsSoldRow[] {
  if (event.priceStatus === 'soldout' || event.status === 'cancelled') {
    return [];
  }

  // A price under a Price check is not offered as a place to buy. The API
  // already drops checked alternates; the primary can still be the one under
  // check, so both counter shapes are read here.
  const checked = new Set<string>();
  if (event.counterSubmission != null) {
    checked.add(event.counterSubmission.parentSubmissionId);
  }
  for (const block of event.priceByTier ?? []) {
    if (block.counterSubmission !== null) {
      checked.add(block.counterSubmission.parentSubmissionId);
    }
  }

  const candidates: WhereItsSoldRow[] = [];
  const primary = findPrimary(event);
  if (primary !== null) candidates.push(primary);
  for (const alt of event.priceAlternates ?? []) {
    // An API from before #546 sends neither; without the id there is no card
    // to open and without the tier no "GA · …" line, so the row is skipped.
    if (alt.id === undefined || alt.tier === undefined) continue;
    candidates.push({
      id: alt.id,
      vendor: alt.vendor ?? 'Other',
      tier: alt.tier,
      priceMin: alt.priceMin,
      priceMax: alt.priceMax,
      sourceCategory: alt.sourceCategory ?? null,
    });
  }

  // The API's trust order, exactly as sent: the primary leads, then the
  // alternates (orchestrator ruling, U15 PR C). One row per seller and tier,
  // the first, so the most trusted of a seller's prices in a tier stands.
  const seen = new Set<string>();
  const rows = candidates
    .filter((row) => !checked.has(row.id))
    .filter((row) => {
      const key = `${row.vendor}|${row.tier}`;
      if (seen.has(key) || seen.has(`id|${row.id}`)) return false;
      seen.add(key);
      seen.add(`id|${row.id}`);
      return true;
    });

  const sellers = new Set(rows.map((row) => row.vendor));
  return sellers.size >= 2 ? rows : [];
}
