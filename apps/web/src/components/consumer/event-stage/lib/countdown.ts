import type { EventStatus } from '@concert-crawl/types';
import { localDateString } from '@/lib/time';
import { formatEventDate } from '@/components/consumer/definitions/lib';
import { EVENT_STAGE_COPY } from '../definitions/copy';

const MS_PER_DAY = 86_400_000;
/** How far back "N days ago" goes before the pill reads the date instead. */
const PAST_COUNTDOWN_DAYS = 30;

/**
 * Whole calendar days from the venue's today to the show's date. Both sides are
 * UTC midnights of a `YYYY-MM-DD`, so the count never drifts across a DST
 * boundary, and "today" is the venue's, never the server's (a Denver evening is
 * already tomorrow in UTC).
 */
export const daysUntilEvent = (date: string, timezone: string): number =>
  Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${localDateString(timezone)}T00:00:00Z`)) /
      MS_PER_DAY,
  );

/**
 * The stage's countdown eyebrow: "4 days away" ahead of the show, "4 days ago"
 * after it. Null when its date is in doubt: a postponed or cancelled show
 * already says so in its status pill, and "4 days away" beside it would
 * contradict that.
 */
export const eventCountdown = (
  date: string,
  timezone: string,
  status: EventStatus,
): string | null => {
  if (status === 'cancelled' || status === 'postponed') return null;
  const days = daysUntilEvent(date, timezone);
  if (Number.isNaN(days)) return null;
  // The past twin of "N days away" (addendum 3, rule 3): Yesterday, then
  // "N days ago" up to 30, then the date itself.
  if (days < 0) {
    if (days === -1) return EVENT_STAGE_COPY.countdown.yesterday;
    if (days >= -PAST_COUNTDOWN_DAYS)
      return EVENT_STAGE_COPY.countdown.daysAgo(-days);
    return formatEventDate(date, timezone, { month: 'short', day: 'numeric' });
  }
  if (days === 0) return EVENT_STAGE_COPY.countdown.tonight;
  if (days === 1) return EVENT_STAGE_COPY.countdown.tomorrow;
  return EVENT_STAGE_COPY.countdown.daysAway(days);
};
