import { bucketMembersFor, type EventWithVenue } from '@concert-crawl/types';
import { genreColor } from '@/lib/genre-color';
import { orderGenres } from '@/components/consumer/event-row/lib/order-genres';

/**
 * Each day's genre colors for the week strip's dots (B+ `cal_m`), derived from
 * the week's loaded shows: one entry per distinct lead-genre color, in show
 * order. The lead genre is the one that colors a row's edge, so the Vibe
 * filter's reorder reaches the dots too. Ungenred shows add nothing; the
 * strip draws its own fallback dot for a day that has shows but no colors.
 *
 * The availability API carries counts only, so the jump picker's month grid
 * keeps plain count dots and only the loaded week gets genre dots.
 */
export function dayGenreColors(
  events: readonly Pick<EventWithVenue, 'date' | 'genre'>[],
  filterVibe: string | undefined,
): Map<string, string[]> {
  const members = bucketMembersFor(filterVibe);
  const byDay = new Map<string, string[]>();
  for (const event of events) {
    const lead = orderGenres(event.genre ?? [], members)[0];
    const color = genreColor(lead);
    if (color === null) continue;
    const colors = byDay.get(event.date) ?? [];
    if (!colors.includes(color)) colors.push(color);
    byDay.set(event.date, colors);
  }
  return byDay;
}
