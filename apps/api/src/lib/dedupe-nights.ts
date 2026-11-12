// One night at one venue is one show, however many event rows the crawler kept
// for it. The same night can arrive from several listings (the venue's own
// page, a ticketing page, a re-listed URL), and past rows are not under the
// partial unique index that protects upcoming ones, so the duplicates survive
// once the night is over. A past list shows each night once.
//
// The rule partitions the rows of one venue and date, so exactly one survives
// per group: timed rows group by their exact time (an early and a late show are
// two nights out), and a row with no time is absorbed by any timed row on that
// date, since the listing just did not say when. Inside a group the caller's
// stamped row wins, then the lowest event id. The Add list applies the same
// rule in SQL (lib/past-shows.ts), per headliner; this one is for a list that
// is already one artist's, where the same venue and date is one night out.

interface Night {
  eventId: string;
  venueSlug: string;
  /** The event-local date, `YYYY-MM-DD`. */
  iso: string;
  /** `HH:MM:SS` wall clock, or null when the listing gave none. */
  showTime: string | null;
}

/** True when `challenger` should be shown instead of `holder`, as rows of one night. */
const beats = (
  challenger: Night,
  holder: Night,
  attendedIds: ReadonlySet<string> | null,
): boolean => {
  const challengerAttended = attendedIds?.has(challenger.eventId) ?? false;
  const holderAttended = attendedIds?.has(holder.eventId) ?? false;
  if (challengerAttended !== holderAttended) return challengerAttended;
  return challenger.eventId < holder.eventId;
};

/**
 * Keeps one row per night, in the order the surviving rows appeared in
 * `rows`. The caller's attended duplicate is kept, so the list never shows
 * "I went" off beside a night they stamped.
 */
export const dedupeNights = <T extends Night>(
  rows: readonly T[],
  attendedIds: ReadonlySet<string> | null = null,
): T[] => {
  // The survivor of each (venue, date, time) group; null time is its own group.
  const survivors = new Map<string, T>();
  const groupKey = (row: Night): string =>
    `${row.venueSlug}|${row.iso}|${row.showTime ?? ''}`;
  const dateKey = (row: Night): string => `${row.venueSlug}|${row.iso}`;

  // A date that has any timed row absorbs its untimed rows.
  const timedDates = new Set(
    rows.filter((row) => row.showTime !== null).map(dateKey),
  );

  for (const row of rows) {
    if (row.showTime === null && timedDates.has(dateKey(row))) continue;
    const key = groupKey(row);
    const current = survivors.get(key);
    if (!current || beats(row, current, attendedIds)) survivors.set(key, row);
  }

  const kept = new Set(survivors.values());
  return rows.filter((row) => kept.has(row));
};
