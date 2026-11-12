// Month buckets for the Concerts list, in whatever order the server sent.
//
// Watching's grouper (WatchingContent.groupShows) buckets *forward* — tonight /
// this week / next week, then month names. Neither half of Concerts wants those
// relative buckets; the shape is the same (insertion-ordered groups with a mono
// label and a count).
//
// This never sorts. It walks the rows once and opens a bucket per new month, so
// the reading direction is the API's to decide: Past arrives newest-first and
// buckets backwards, Upcoming arrives soonest-first and buckets forwards (#1357).
// Re-sorting here would break one of the two halves.

import type { HistoryShow } from '@concert-crawl/types';

export interface HistoryBucket<T extends { date: string } = HistoryShow> {
  key: string;
  label: string;
  shows: T[];
}

// `date` is a YYYY-MM-DD event-local date, so it's parsed as local midnight to
// keep the month label from sliding a day backwards in Mountain Time.
const monthKeyOf = (
  date: string,
  alwaysYear: boolean,
): { key: string; label: string } => {
  const parsed = new Date(`${date}T00:00:00`);
  const year = parsed.getFullYear();
  const currentYear = new Date().getFullYear();
  const month = parsed.toLocaleDateString('en-US', { month: 'long' });
  return {
    key: `${year}-${parsed.getMonth()}`,
    // The year is only worth the pixels once it isn't the current one, except
    // on the Add sheet, which draws it on every month ("NOVEMBER 2026").
    label: year === currentYear && !alwaysYear ? month : `${month} ${year}`,
  };
};

export const groupHistoryByMonth = <T extends { date: string }>(
  shows: readonly T[],
  { alwaysYear = false }: { alwaysYear?: boolean } = {},
): HistoryBucket<T>[] => {
  const byKey = new Map<string, HistoryBucket<T>>();
  const order: string[] = [];

  for (const show of shows) {
    const { key, label } = monthKeyOf(show.date, alwaysYear);
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = { key, label, shows: [] };
      byKey.set(key, bucket);
      order.push(key);
    }
    bucket.shows.push(show);
  }

  return order.flatMap((key) => {
    const bucket = byKey.get(key);
    return bucket ? [bucket] : [];
  });
};
