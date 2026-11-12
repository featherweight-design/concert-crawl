import {
  BUCKET_LABELS,
  bucketForGenre,
  type EventWithVenue,
  type GenreBucket,
} from '@concert-crawl/types';
import { MAX_DAY_DOTS } from '@/components/consumer/week-strip/WeekStrip';

/**
 * Each day's genre colors for the week strip's dots (B+ addendum 2, item 19),
 * derived from the week's loaded shows: one dot per distinct genre bucket
 * among the day's shows, at most four. The dots are ordered by how many shows
 * carry that bucket (most first), with ties in the `genre-buckets.ts` order.
 * A show with two genres counts for both buckets, but once per bucket. Shows
 * with no bucketed genre add nothing.
 *
 * The availability API carries counts only, so the jump picker's month grid
 * keeps plain count dots and only the loaded week gets genre dots.
 */
export function dayGenreColors(
  events: readonly Pick<EventWithVenue, 'date' | 'genre'>[],
): Map<string, string[]> {
  const countsByDay = new Map<string, Map<GenreBucket, number>>();
  for (const event of events) {
    const buckets = new Set<GenreBucket>();
    for (const raw of event.genre ?? []) {
      const bucket = bucketForGenre(raw);
      if (bucket) buckets.add(bucket);
    }
    if (buckets.size === 0) continue;
    const counts =
      countsByDay.get(event.date) ?? new Map<GenreBucket, number>();
    for (const bucket of buckets) {
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    countsByDay.set(event.date, counts);
  }

  const byDay = new Map<string, string[]>();
  for (const [date, counts] of countsByDay) {
    const ordered = [...counts.keys()].sort(
      (left, right) =>
        (counts.get(right) ?? 0) - (counts.get(left) ?? 0) ||
        BUCKET_LABELS.indexOf(left) - BUCKET_LABELS.indexOf(right),
    );
    byDay.set(
      date,
      ordered.slice(0, MAX_DAY_DOTS).map((bucket) => `var(--genre-${bucket})`),
    );
  }
  return byDay;
}
