// One night at one venue is one show, however many event rows the crawler kept
// for it. The same headliner can arrive from several listings of one night
// (the venue's own page, a ticketing page, a re-listed URL), and past rows are
// not under the partial unique index that protects upcoming ones, so the dups
// survive once the night is over. A past list shows each night once.
//
// Two rows are the same night when they share venue, date and show time. A row
// with no time is the same night as a timed row on that date (the listing just
// did not say), but two different times stay two shows: an early and a late
// show are two nights out.

interface Night {
  eventId: string;
  venueSlug: string;
  /** The event-local date, `YYYY-MM-DD`. */
  iso: string;
  /** `HH:MM:SS` wall clock, or null when the listing gave none. */
  showTime: string | null;
}

/**
 * Keeps one row per night, in the order the first of each night appeared.
 * When the caller attended one of the duplicates, that one is kept, so the
 * list never shows "I went" off beside a night they stamped.
 */
export const dedupeNights = <T extends Night>(
  rows: readonly T[],
  attendedIds: ReadonlySet<string> | null = null,
): T[] => {
  const kept: T[] = [];

  for (const row of rows) {
    const twin = kept.findIndex(
      (other) =>
        other.venueSlug === row.venueSlug &&
        other.iso === row.iso &&
        (other.showTime === row.showTime ||
          other.showTime === null ||
          row.showTime === null),
    );

    if (twin === -1) {
      kept.push(row);
      continue;
    }

    const current = kept[twin];
    if (!current) continue;
    // The attended duplicate wins; otherwise the first one stays.
    if (attendedIds?.has(row.eventId) && !attendedIds.has(current.eventId)) {
      kept[twin] = row;
    }
  }

  return kept;
};
