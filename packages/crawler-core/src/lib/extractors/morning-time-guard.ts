// The model sometimes returns a morning hour for an evening show ("7:30 PM"
// as 07:30:00): the same Red Rocks listing was stored at 19:30 on one crawl and
// 07:30 on a later one. This corrects a time ONLY when the page itself shows
// that clock time with "PM" and never with "AM", so a real morning event (Yoga
// on the Rocks at 7:00 AM) is never moved: if the page carries both, or neither,
// the model's answer stands.

/** How much page text around an event's title belongs to its listing. */
const NEARBY_BEFORE = 200;
const NEARBY_AFTER = 600;

/** `07:30`, `7:30:00` -> hour, minutes, seconds; null when not a clock time. */
const parseClock = (
  time: string,
): { hour: number; minutes: string; seconds: string } | null => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minutes: match[2] as string,
    seconds: match[3] ?? '00',
  };
};

/** Whether the text shows `hour:minutes` followed by the given meridiem. */
const showsClock = (
  pageText: string,
  hour: number,
  minutes: string,
  meridiem: 'a' | 'p',
): boolean => {
  // "7:30 pm", "7:30pm", "07:30 P.M.", and "7 pm" for an on-the-hour time.
  const clock = minutes === '00' ? `0?${hour}(?::00)?` : `0?${hour}:${minutes}`;
  return new RegExp(`(?<![\\d:])${clock}\\s*${meridiem}\\.?\\s?m\\b`, 'i').test(
    pageText,
  );
};

/**
 * The time the page supports: a morning hour (1 to 11) the page shows only as
 * PM moves to the evening; everything else is returned as it came.
 */
export function correctMorningTime<T extends string | null | undefined>(
  time: T,
  pageText: string,
  eventTitle: string,
): T | string {
  if (typeof time !== 'string') return time;
  const clock = parseClock(time);
  if (clock === null || clock.hour < 1 || clock.hour > 11) return time;
  // Only the text around THIS event's own title counts: a page lists many
  // events, and another one's "7:30 PM" says nothing about this one. A title
  // the page does not carry leaves the model's answer alone.
  const at =
    eventTitle.trim() === ''
      ? -1
      : pageText.toLowerCase().indexOf(eventTitle.trim().toLowerCase());
  if (at < 0) return time;
  const nearby = pageText.slice(
    Math.max(0, at - NEARBY_BEFORE),
    at + eventTitle.length + NEARBY_AFTER,
  );
  const evening = showsClock(nearby, clock.hour, clock.minutes, 'p');
  const morning = showsClock(nearby, clock.hour, clock.minutes, 'a');
  if (!evening || morning) return time;
  return `${String(clock.hour + 12).padStart(2, '0')}:${clock.minutes}:${clock.seconds}`;
}
