import { reportFailure } from '@concert-crawl/logger'

// Matches ISO datetimes with an explicit timezone designator (Z, +HH:MM, or -HH:MM after the time portion).
// Naive datetimes like "2026-06-15T22:00:00" are intentionally excluded — they're interpreted as already venue-local.
export const HAS_EXPLICIT_TZ =
  /T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/

// Naive datetimes may separate date from time with `T` or, as Hold My Ticket
// emits, a space ("2026-08-01 20:00:00"). Splitting on `T` alone leaves the
// whole string as the "date" and loses the show time.
const NAIVE_DATETIME_SEPARATOR = /[T ]/

export function partsInTimezone(
  date: Date,
  timeZone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  // Intl returns "24" for midnight in hour12: false — normalize to "00".
  const hour = pick('hour') === '24' ? '00' : pick('hour')

  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${hour}:${pick('minute')}:${pick('second')}`,
  }
}

export function extractDateOnly(dateStr: string, timeZone: string): string {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).date
  }
  // Naive datetimes and date-only strings → take the date portion as-is.
  return dateStr.trim().split(NAIVE_DATETIME_SEPARATOR)[0] ?? dateStr
}

export function extractTimeOnly(
  dateStr: string,
  timeZone: string,
): string | undefined {
  if (HAS_EXPLICIT_TZ.test(dateStr)) {
    return partsInTimezone(new Date(dateStr), timeZone).time
  }
  const parts = dateStr.trim().split(NAIVE_DATETIME_SEPARATOR)
  if (parts.length < 2) return undefined
  // Strip any malformed trailing timezone fragment defensively.
  return parts[1]?.split(/[+\-Z]/)[0]
}

// Default fallback for callers that haven't yet been updated to pass venue.timezone.
// Production callers should always pass the venue's IANA zone — the default is for backward compat / tests only.
export const DEFAULT_TIME_ZONE = 'America/Denver'

// venues.timezone is a plain text column with no IANA validation. A typo would crash
// Intl.DateTimeFormat in partsInTimezone and take down the whole venue's crawl. Validate
// once at the entry point and fall back to UTC so the crawl keeps producing rows.
export function validateTimeZone(
  timeZone: string,
  sourceUrl: string,
  event: string,
): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return timeZone
  } catch {
    reportFailure({
      event,
      severity: 'error',
      sourceUrl,
      timeZone,
      fallback: 'UTC',
    })
    return 'UTC'
  }
}
