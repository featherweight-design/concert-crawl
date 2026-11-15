/** What the crawl does to one listed row's `event_artists`. */
export type CrawledLineupAction = 'sync' | 'clear' | 'none';

export interface CrawledLineupFacts {
  /** The extractor read the listing as not a concert (`isConcert: false`). */
  readNotConcert: boolean;
  /** The stored row is hidden from consumers (by the extractor or an admin). */
  hidden: boolean;
  /** The row is manual or has a saved lineup (`lineup_edited_at`). */
  billLocked: boolean;
  /** This run upserted the row. */
  upserted: boolean;
  /** The stored bill names an artist this run created. Asked only when needed. */
  namesCreatedArtist: () => boolean;
}

/**
 * Admin 4a-2: a hidden row's lineup is cleared. A listing the extractor reads
 * as not a concert clears it too, unless the bill is the admin's (a manual row
 * or a saved lineup): the listing's verdict is about the listing, and a crawl
 * that landed on the admin's show must not wipe the lineup they entered. An
 * upserted row is rebuilt, and an unchanged one only when its bill names an
 * artist created this run.
 */
export function crawledLineupAction(
  facts: CrawledLineupFacts,
): CrawledLineupAction {
  if (facts.hidden) return 'clear';
  if (facts.readNotConcert) return facts.billLocked ? 'none' : 'clear';
  if (facts.upserted) return 'sync';
  return facts.namesCreatedArtist() ? 'sync' : 'none';
}
