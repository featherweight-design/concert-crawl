/** @deprecated Use venue.timezone directly. Kept for admin components until they are updated. */
export const DENVER_TIME_ZONE = 'America/Denver'

/** Returns the current date as a YYYY-MM-DD string in the given IANA timezone. */
export function localDateString(timezone: string): string {
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

export const formatISODate = (
  iso: string,
  timeZone: string,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
): string =>
  new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(
    new Date(iso),
  )

export const formatDurationMs = (ms: number | null): string => {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
