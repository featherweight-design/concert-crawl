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
