// apps/api/src/lib/price-check-outcome.ts
//
// How the last price check on a live price ended, derived from the
// submission rows themselves. No audit_log lookup: it has no index beyond its
// primary key, and a check decided by fan confirms alone (see
// settleCheckOnCounterPromotion in price-check.ts) writes no audit row.
//
// A decided check leaves these rows behind:
//   - an update won (admin or fan confirms): the live row is that update, its
//     disputedSubmissionId names the old price, and the old price is archived
//     with its price intact. Outcome 'updated'.
//   - the price held (an admin resolved the check as parent_wins): the live
//     row is the original, with one or more archived updates pointing at it.
//     Outcome 'held'. A fan-confirm win never leaves a live original behind,
//     so 'held' is always an admin decision. (An admin cannot reject an
//     update on a price under check, so a rejection never makes one.)
// A withdrawn update is deleted, so it leaves nothing to show; an update's
// owner deleting their own archived loser likewise drops the card.
//
// Archived rows are not touched again, so their updatedAt is the moment the
// check was decided. Deciding a check writes the live row and the archived
// row in one transaction, so their updatedAt is equal; a later write to the
// live row (an admin price edit) leaves it newer, and then the outcome no
// longer describes the price on the card, so it is dropped.

import type { PriceCheckOutcome } from '@concert-crawl/types';

/** How long a decided check stays on the card. */
export const PRICE_CHECK_OUTCOME_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

// updatedAt is stamped by Postgres now() and compared with this process's
// clock, so a decision made seconds ago can read a little in the future when
// the API host runs behind the database. Allow that much; anything further
// ahead is not a real decision time.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// Reasons written when an update WON a check (settleCheckOnCounterPromotion):
// the rows they archive are the old price and the other pending updates. An
// archived update carrying one of these is not a loser the price held against.
const WON_CHECK_REASON_PREFIXES = [
  'Replaced by price check update',
  'Superseded by price check update',
] as const;

export interface ArchivedCheckRow {
  id: string;
  priceMin: string;
  priceMax: string | null;
  disputedSubmissionId: string | null;
  archivedReason: string | null;
  updatedAt: Date;
}

/**
 * The newest decided check within the window, or null. `archived` is every
 * archived row that is either the live price's predecessor or points at the
 * live price; rows that are neither are ignored.
 */
export function pickPriceCheckOutcome(input: {
  liveId: string;
  liveDisputedSubmissionId: string | null;
  liveUpdatedAt: Date;
  archived: readonly ArchivedCheckRow[];
  now: Date;
}): PriceCheckOutcome | null {
  const { liveId, liveDisputedSubmissionId, liveUpdatedAt, archived, now } =
    input;
  let newest: { at: Date; outcome: PriceCheckOutcome } | null = null;

  for (const row of archived) {
    const age = now.getTime() - row.updatedAt.getTime();
    if (age < -CLOCK_SKEW_MS || age > PRICE_CHECK_OUTCOME_DAYS * DAY_MS) {
      continue;
    }
    // The live row was written after the check was decided: it is no longer
    // the price the check settled.
    if (liveUpdatedAt.getTime() > row.updatedAt.getTime()) continue;

    let outcome: PriceCheckOutcome | null = null;
    if (
      liveDisputedSubmissionId !== null &&
      row.id === liveDisputedSubmissionId
    ) {
      outcome = {
        outcome: 'updated',
        resolvedAt: row.updatedAt.toISOString(),
        previous: {
          floor: parseFloat(row.priceMin),
          ceiling: row.priceMax !== null ? parseFloat(row.priceMax) : null,
        },
      };
    } else if (
      row.disputedSubmissionId === liveId &&
      !WON_CHECK_REASON_PREFIXES.some((prefix) =>
        row.archivedReason?.startsWith(prefix),
      )
    ) {
      outcome = {
        outcome: 'held',
        resolvedAt: row.updatedAt.toISOString(),
        previous: null,
      };
    }
    if (outcome !== null && (newest === null || row.updatedAt > newest.at)) {
      newest = { at: row.updatedAt, outcome };
    }
  }

  return newest?.outcome ?? null;
}
