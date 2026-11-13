const mountainDay = (instant: Date): string =>
  instant.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

/** The calendar day before a `YYYY-MM-DD` day (not "24 hours ago": DST). */
const dayBefore = (day: string): string =>
  new Date(Date.parse(`${day}T12:00:00Z`) - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

/** "Sep 18" for a `YYYY-MM-DD` date, "Thu Nov 12" with `weekday`. */
export const shortDay = (date: string, weekday = false): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
    .toLocaleDateString('en-US', {
      ...(weekday ? { weekday: 'short' } : {}),
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '');
};

/**
 * "Today", "Yesterday" or "Sep 18": when a fan filed a price, by Mountain Time
 * day (`now` is a parameter so the rule can be tested).
 */
export const filedWhen = (
  iso: string,
  words: { today: string; yesterday: string },
  now: Date = new Date(),
): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const day = mountainDay(at);
  if (day === mountainDay(now)) return words.today;
  if (day === dayBefore(mountainDay(now))) {
    return words.yesterday;
  }
  return shortDay(day);
};

/** "Nov 11, 9:40 AM" for a decision made today or yesterday, else "Nov 9". */
export const decidedWhen = (iso: string, now: Date = new Date()): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const day = mountainDay(at);
  const recent =
    day === mountainDay(now) || day === dayBefore(mountainDay(now));
  const date = shortDay(day);
  if (!recent) return date;
  const time = at.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver',
  });
  return `${date}, ${time}`;
};
