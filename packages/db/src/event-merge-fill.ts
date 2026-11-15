/**
 * What a kept event row takes from the rows merged into it: the ONE fill rule,
 * shared by the duplicate-night cleanup (crawler-core) and the admin merge
 * (`mergeEventRows` with `fillBlanks`), so the two can never disagree about
 * what a merge keeps. Pure: it reads rows and returns values, it writes
 * nothing.
 *
 * - Only a column the keeper has none of is filled, in coherent groups taken
 *   from ONE donor (the first that holds the group's first column), so related
 *   values stay a pair: a price range and its source, a ticket link and its
 *   typed links, a show time and its doors.
 * - The bill is a union instead (`unionBill`) when every row names the same
 *   artist; otherwise it is filled only where the keeper's headliners are NULL,
 *   from one donor. A lineup an admin saved (`lineup_edited_at`) never takes a
 *   donor's names.
 */

import { unionBill, changedBillFields, type BillField } from './union-bill.js';
import type { events } from './schema/index.js';

type EventRow = typeof events.$inferSelect;

/** Column groups a keeper takes from one donor when it has none of its own. */
export const MERGE_FILL_GROUPS = [
  ['showTime', 'doorsTime'],
  ['ticketUrl', 'ticketLinks'],
  ['eventUrl'],
  ['imageUrl'],
  ['description'],
  ['tourName'],
  ['genre'],
  ['ticketPriceMin', 'ticketPriceMax', 'priceSource'],
] as const satisfies readonly (readonly (keyof EventRow)[])[];

/**
 * The first column of each group filled, or the bill's display array(s) a
 * merge changes.
 */
export type MergeFillField =
  (typeof MERGE_FILL_GROUPS)[number][number] | BillField;

/** The bill's columns: written together, and re-checked by a later write. */
export const MERGE_BILL_COLUMNS = [
  'headliners',
  'canonicalHeadliners',
  'supportingArtists',
  'canonicalSupporting',
] as const satisfies readonly (keyof EventRow)[];

/** Whether a fill writes the bill (so the lineup rows need a rebuild). */
export const mergeFillWritesBill = (
  fields: readonly MergeFillField[],
): boolean =>
  fields.includes('headliners') || fields.includes('supportingArtists');

/**
 * What the keeper takes from the rows folded into it: every empty column's
 * group from one donor, and every donor-only name on the bill.
 */
export const mergeFillsFrom = (
  keeper: EventRow,
  donors: readonly EventRow[],
): { fields: MergeFillField[]; values: Partial<EventRow> } => {
  const fields: MergeFillField[] = [];
  const values: Partial<EventRow> = {};
  // Admin 4a: a lineup an admin saved never takes a donor's names, even where
  // it is empty (an admin may have cleared the supports).
  if (keeper.lineupEditedAt === null) {
    const oneArtist = donors.every(
      (donor) => donor.canonicalArtist === keeper.canonicalArtist,
    );
    if (oneArtist) {
      const bill = unionBill(keeper, donors);
      if (bill !== null) {
        fields.push(...changedBillFields(keeper, bill));
        Object.assign(values, bill);
      }
    } else if (keeper.headliners === null) {
      // The rows name different artists: a donor's names may belong to
      // another show, so the bill is not unioned, only filled where the
      // keeper has none, from one donor. A donor hidden from consumers gives
      // no names, as in the union.
      const donor = donors.find(
        (row) => row.headliners !== null && row.hiddenFromConsumer !== true,
      );
      if (donor) {
        fields.push('headliners');
        for (const field of MERGE_BILL_COLUMNS) {
          if (keeper[field] === null && donor[field] !== null) {
            Object.assign(values, { [field]: donor[field] });
          }
        }
      }
    }
  }
  for (const group of MERGE_FILL_GROUPS) {
    const anchor = group[0];
    if (keeper[anchor] !== null) continue;
    const donor = donors.find((row) => row[anchor] != null);
    if (!donor) continue;
    fields.push(anchor);
    for (const field of group) {
      if (keeper[field] === null && donor[field] != null) {
        Object.assign(values, { [field]: donor[field] });
      }
    }
  }
  return { fields, values };
};
