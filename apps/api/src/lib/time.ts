/**
 * True when `eventDate` (a `YYYY-MM-DD` string from the events.date column) is
 * within `thresholdDays` of today, inclusive of the threshold.
 *
 * Both sides are pinned to UTC midnight so a same-day evening show (which
 * `new Date(eventDate) - Date.now()` would round to -1) stays imminent. Used
 * by the price-corroboration confirm endpoint, the events detail response,
 * and the event-reports flow.
 */
export function isImminentEvent(
  eventDate: string | null,
  thresholdDays: number,
): boolean {
  if (!eventDate) return false
  const [year, month, day] = eventDate.split('-').map(Number)
  if (year == null || month == null || day == null) return false
  const eventMs = Date.UTC(year, month - 1, day)
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  )
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= thresholdDays
}

/**
 * Returns the current date as a YYYY-MM-DD string in the given IANA timezone.
 * Use the venue's timezone when filtering venue-specific queries.
 * Fall back to 'UTC' for cross-venue queries where no single timezone applies.
 */
export function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error(`Unable to derive current date for timezone: ${timezone}`)
  }

  return `${year}-${month}-${day}`
}
