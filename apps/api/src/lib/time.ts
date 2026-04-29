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
