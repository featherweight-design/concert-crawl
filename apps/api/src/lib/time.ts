// Every venue is in Denver, and events.date holds the venue-local calendar
// date. "Today" must be Denver's: after 5 PM MST (6 PM MDT) UTC has already
// rolled to tomorrow, and a UTC bound drops that night's shows.
export const MT_TIME_ZONE = 'America/Denver';

/**
 * True when `eventDate` (a `YYYY-MM-DD` string from the events.date column) is
 * within `thresholdDays` of today in Denver, inclusive of the threshold.
 *
 * Both sides are pinned to UTC midnight of their calendar dates so a same-day
 * evening show (which `new Date(eventDate) - Date.now()` would round to -1)
 * stays imminent. Used by the price-corroboration confirm endpoint, the
 * events detail response, and the event-reports flow.
 */
export function isImminentEvent(
  eventDate: string | null,
  thresholdDays: number,
): boolean {
  if (!eventDate) return false;
  const [year, month, day] = eventDate.split('-').map(Number);
  if (year == null || month == null || day == null) return false;
  const eventMs = Date.UTC(year, month - 1, day);
  const todayMs = Date.parse(`${todayInDenver()}T00:00:00Z`);
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= thresholdDays;
}

/**
 * Returns the current date as a YYYY-MM-DD string in the given IANA timezone.
 * Use todayInDenver() for anything compared against events.date.
 */
export function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to derive current date for timezone: ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

/** Today's `YYYY-MM-DD` in Denver, the calendar events.date is written in. */
export const todayInDenver = (): string => todayInTimezone(MT_TIME_ZONE);
