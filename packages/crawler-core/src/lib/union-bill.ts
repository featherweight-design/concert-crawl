/**
 * The bill a night keeps when duplicate rows of it are folded into one.
 *
 * Two listings of one night often name different acts: the venue page lists a
 * support the ticketing page leaves off, or the other way round. Taking the
 * keeper's bill as it stands (or a donor's only when the keeper has none) loses
 * every name that exists on a donor alone, and the donor row is deleted by the
 * fold. Once the donor's source stops listing those names, no crawl brings them
 * back. This unions the donors' names into the keeper's bill instead. The union
 * holds until the keeper's own source is re-crawled and the crawl writes its own
 * reading of the bill (its billOwned/billChanged path); what it stops is the
 * permanent loss of a name only the deleted donor carried.
 *
 * - A keeper whose headliners are an empty array (not NULL) has a deliberate
 *   "nobody billed" ruling (a tribute or cover night, a non-concert verdict):
 *   that bill is closed, and neither array takes a donor's names.
 * - A donor hidden from consumers (`hiddenFromConsumer`) gives no names.
 * - The keeper's names come first, in its own order and roles; each donor's new
 *   names follow in donor order. All donors' headliners are taken before any
 *   donor's supports, so an act one listing headlines is not demoted to support
 *   by another.
 * - A name is new when its `canonicalizeArtist` form is on neither of the bill's
 *   arrays so far. So "ROSSI" does not join "Rossi", and a donor's support who
 *   is already a keeper headliner is not added again as support. No other name
 *   rule is applied here.
 * - NULL stays NULL only when every row holds NULL for that array (the
 *   ladder's no-verdict signal); otherwise the union of the non-NULL arrays.
 * - The canonical arrays are written the way the crawl writes them: through
 *   `canonicalizeSupporting`, from the display arrays, NULL for NULL.
 *
 * Ownership is the caller's: an admin-saved lineup is never passed here.
 */

import {
  canonicalizeArtist,
  canonicalizeSupporting,
} from '@concert-crawl/types';

export interface Bill {
  headliners: string[] | null;
  supportingArtists: string[] | null;
  canonicalHeadliners: string[] | null;
  canonicalSupporting: string[] | null;
}

type BillNames = Pick<Bill, 'headliners' | 'supportingArtists'>;

/** A folded row's bill, and whether it is hidden from consumers. */
export type DonorBill = BillNames & { hiddenFromConsumer?: boolean };

/** The bill's display arrays, as the fill reports them. */
export type BillField = 'headliners' | 'supportingArtists';

const sameArray = (
  left: readonly string[] | null,
  right: readonly string[] | null,
): boolean =>
  left === null || right === null
    ? left === right
    : left.length === right.length &&
      left.every((value, index) => value === right[index]);

/**
 * The keeper's bill with every donor-only name added, or null when the donors
 * add nothing (so nothing is written).
 */
export const unionBill = (
  keeper: Bill,
  allDonors: readonly DonorBill[],
): Bill | null => {
  // `[]` headliners is a ruling that nobody is billed, not a gap to fill.
  if (keeper.headliners !== null && keeper.headliners.length === 0) {
    return null;
  }
  const donors = allDonors.filter((donor) => donor.hiddenFromConsumer !== true);
  const seen = new Set<string>();
  const remember = (name: string): void => {
    seen.add(canonicalizeArtist(name));
  };
  keeper.headliners?.forEach(remember);
  keeper.supportingArtists?.forEach(remember);

  const extend = (
    own: string[] | null,
    pick: (donor: BillNames) => string[] | null,
  ): string[] | null => {
    let result = own === null ? null : [...own];
    for (const donor of donors) {
      const names = pick(donor);
      if (names === null) continue;
      result ??= [];
      for (const name of names) {
        const canonical = canonicalizeArtist(name);
        if (canonical === '' || seen.has(canonical)) continue;
        seen.add(canonical);
        result.push(name);
      }
    }
    return result;
  };

  const headliners = extend(keeper.headliners, (donor) => donor.headliners);
  const supportingArtists = extend(
    keeper.supportingArtists,
    (donor) => donor.supportingArtists,
  );
  if (
    sameArray(headliners, keeper.headliners) &&
    sameArray(supportingArtists, keeper.supportingArtists)
  ) {
    return null;
  }
  return {
    headliners,
    supportingArtists,
    canonicalHeadliners:
      headliners === null ? null : canonicalizeSupporting(headliners),
    canonicalSupporting:
      supportingArtists === null
        ? null
        : canonicalizeSupporting(supportingArtists),
  };
};

/** Which of the bill's display arrays `next` changes from `keeper`'s. */
export const changedBillFields = (
  keeper: BillNames,
  next: BillNames,
): BillField[] => {
  const fields: BillField[] = [];
  if (!sameArray(keeper.headliners, next.headliners)) fields.push('headliners');
  if (!sameArray(keeper.supportingArtists, next.supportingArtists)) {
    fields.push('supportingArtists');
  }
  return fields;
};
