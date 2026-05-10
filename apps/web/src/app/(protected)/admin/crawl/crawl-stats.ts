const MT_TIMEZONE = 'America/Denver'

/**
 * Given a list of runs ordered newest-first, returns a hint string showing the
 * sweep date and time range, e.g. "May 7 · 12:14–12:42". Uses the first run
 * as sweep end and the last as sweep start.
 */
export function formatSweepHint(runs: { createdAt: string }[]): string {
  if (runs.length === 0) return ''

  const endRun = runs[0]
  const startRun = runs[runs.length - 1]
  if (!endRun || !startRun) return ''

  const endDate = new Date(endRun.createdAt)
  const startDate = new Date(startRun.createdAt)

  const dateStr = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: MT_TIMEZONE,
  })

  const fmtTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: MT_TIMEZONE,
    })

  if (runs.length === 1) return `${dateStr} · ${fmtTime(endDate)}`
  return `${dateStr} · ${fmtTime(startDate)}–${fmtTime(endDate)}`
}

/**
 * Given today's runs, returns a breakdown string e.g.
 * "20 ok · 1 partial · 2 failed".
 * Only includes statuses with at least one run.
 * CrawlRun.status is 'success' | 'partial' | 'failed' — there is no 'blocked' value.
 */
export function formatRunsBreakdown(runs: { status: string }[]): string {
  if (runs.length === 0) return ''

  const counts: Record<string, number> = {}
  for (const run of runs) {
    counts[run.status] = (counts[run.status] ?? 0) + 1
  }

  return [
    counts['success'] ? `${counts['success']} ok` : null,
    counts['partial'] ? `${counts['partial']} partial` : null,
    counts['failed'] ? `${counts['failed']} failed` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
