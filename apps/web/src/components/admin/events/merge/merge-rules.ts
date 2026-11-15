/**
 * The merge panel's words from its numbers (admin 4b E4): the summary under
 * the compare cards, and each card's From, Price and Reports rows. Pure, so
 * the sentence a destructive button hangs on is tested, not eyeballed.
 */
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { adminPriceRange } from '@/lib/admin/price-format';
import type { MergeListing, MergePreview } from './merge-api';

const COPY = ADMIN_COPY.eventEdit.merge;

/** Which of the two listings the admin keeps. The pick list's row is second. */
export type KeepSide = 'first' | 'second';

/** "Thu Nov 12", the board's day, from a `YYYY-MM-DD` date. */
export const mergeDay = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .formatToParts(new Date(`${date}T00:00:00Z`))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value)
    .join(' ');

/** The date tile's two lines: "THU" over "12". */
export const mergeDateTile = (
  date: string,
): { weekday: string; day: string } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return { weekday: pick('weekday').toUpperCase(), day: pick('day') };
};

/** A row's From: the crawl, or an admin's hand. */
export const fromLabel = (
  listing: Pick<MergeListing, 'manual' | 'addedBy'>,
): string => {
  if (!listing.manual) return COPY.fromCrawl;
  // A2: "added by @handle", or "added by hand" for an admin with no handle.
  return listing.addedBy === null
    ? COPY.fromHand
    : COPY.fromHandle(listing.addedBy.handle);
};

/** The price a card shows, or "no price". */
export const priceLabel = (price: MergeListing['price']): string =>
  adminPriceRange(price.min, price.max) ?? COPY.noPrice;

/** "none", or the open reports by kind: "1 sold-out report, 2 cancelled reports". */
export const reportsLabel = (reports: MergeListing['reports']): string => {
  const kinds = Object.entries(reports.byKind)
    .filter(([, total]) => total > 0)
    .map(([kind, total]) => COPY.reportCount(total, kind));
  return kinds.length === 0 ? COPY.noReports : kinds.join(', ');
};

/** A pick row's second line: "Red Rocks · added by hand · 3 Watching". */
export const pickDetail = (row: {
  venueName: string | null;
  manual: boolean;
  addedBy: MergeListing['addedBy'];
  watchers: number;
}): string =>
  [row.venueName, fromLabel(row), COPY.watchingCount(row.watchers)]
    .filter((part): part is string => part !== null)
    .join(' · ');

const otherOf = (keep: KeepSide): KeepSide =>
  keep === 'first' ? 'second' : 'first';

/**
 * "After merging: 34 Watching, one price, one report. The second listing
 * redirects here. Nobody gets a notice." The price clause names the price
 * only when the kept listing had none of its own and takes the other's; the
 * crawl clause appears when the kept listing was added by hand and the one
 * merged away came from the crawl (the next crawl then updates the kept row,
 * A1). `preview.kept` is the listing that stays.
 */
export const buildMergeSummary = (
  preview: MergePreview,
  keep: KeepSide,
): string => {
  const { kept, other, after } = preview;
  const afterPrice = adminPriceRange(after.price.min, after.price.max);
  const keptPrice = adminPriceRange(kept.price.min, kept.price.max);
  const reportTotal = kept.reports.total + other.reports.total;

  const parts = [COPY.watchingCount(after.watchers)];
  if (afterPrice !== null) {
    parts.push(
      keptPrice === null
        ? COPY.summary.keptPrice(afterPrice)
        : COPY.summary.onePrice,
    );
  }
  if (reportTotal === 1) parts.push(COPY.summary.oneReport);
  else if (reportTotal > 1) parts.push(COPY.summary.reports(reportTotal));

  const redirects =
    kept.manual && !other.manual
      ? COPY.summary.redirectsAndCrawl(otherOf(keep))
      : COPY.summary.redirects(otherOf(keep));
  return `${COPY.summary.lead} ${parts.join(', ')}. ${redirects} ${COPY.summary.silent}`;
};
