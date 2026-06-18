const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Number of daily sweeps an admin should believe the event has been missing.
 * Floors at 1 — a row is in the Missing tab because at least one sweep
 * didn't find it. We never want to render "missed 0 sweeps."
 */
export const computeMissedSweeps = (
  firstMissingAtIso: string,
  nowIso: string,
): number => {
  const firstMs = new Date(firstMissingAtIso).getTime()
  const nowMs = new Date(nowIso).getTime()
  const days = Math.floor((nowMs - firstMs) / MS_PER_DAY)
  return Math.max(1, days)
}

/**
 * Last-seen ISO timestamp formatted as e.g. "Jun 12" (Denver-local).
 */
export const formatLastSeen = (iso: string | null): string => {
  if (iso === null) return '—'
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
  })
}
