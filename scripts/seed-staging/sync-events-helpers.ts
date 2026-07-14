/**
 * Concert Crawl — pure helpers for the events sync step.
 *
 * Isolated in a separate file so unit tests can import them without
 * pulling in any Drizzle or DB dependencies.
 */

/**
 * Returns the start of the rolling window (30 days before `now`) as a
 * YYYY-MM-DD string (UTC). The read query will be `WHERE date >= fromDate`;
 * there is no upper bound — "past 30 days → all future".
 */
export function rollingWindow(now: Date): { fromDate: string } {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const from = new Date(now.getTime() - THIRTY_DAYS_MS)

  // Format as YYYY-MM-DD using UTC components to avoid local-timezone drift.
  const year = from.getUTCFullYear()
  const month = String(from.getUTCMonth() + 1).padStart(2, '0')
  const day = String(from.getUTCDate()).padStart(2, '0')

  return { fromDate: `${year}-${month}-${day}` }
}
