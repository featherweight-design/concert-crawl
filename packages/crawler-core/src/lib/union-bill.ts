/**
 * The bill a night keeps when duplicate rows of it are folded into one.
 *
 * Two listings of one night often name different acts: the venue page lists a
 * support the ticketing page leaves off, or the other way round. Taking the
 * keeper's bill as it stands (or a donor's only when the keeper has none) loses
 * every name that exists on a donor alone, and the donor row is deleted by the
 * fold, so the name is gone for good. This unions the donors' names into the
 * keeper's bill instead.
 *
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
  donors: readonly BillNames[],
): Bill | null => {
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
