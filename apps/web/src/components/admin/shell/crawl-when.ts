const MOUNTAIN = 'America/Denver';

/**
 * "today, 3:00 AM" or "yesterday, 3:00 AM", then "Nov 12, 3:00 AM" further
 * back: the day in Mountain Time, as the 3 AM crawl is scheduled in it.
 */
export const crawlWhen = (iso: string, now: Date): string | null => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const day = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: MOUNTAIN,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  const clock = new Intl.DateTimeFormat('en-US', {
    timeZone: MOUNTAIN,
    hour: 'numeric',
    minute: '2-digit',
  }).format(at);
  const ago = Math.round(
    (Date.parse(day(now)) - Date.parse(day(at))) / (24 * 60 * 60 * 1000),
  );
  if (ago === 0) return `today, ${clock}`;
  if (ago === 1) return `yesterday, ${clock}`;
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: MOUNTAIN,
    month: 'short',
    day: 'numeric',
  }).format(at);
  return `${date}, ${clock}`;
};
