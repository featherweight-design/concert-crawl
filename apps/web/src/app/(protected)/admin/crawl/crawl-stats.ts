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

/**
 * Sums llmCostUsd across runs and returns a formatted cost string, e.g. "$0.0012".
 * Returns empty string when no runs had LLM cost.
 */
export function formatLlmCostTotal(
  runs: { llmCostUsd?: number | null }[],
): string {
  const total = runs.reduce((acc, run) => acc + (run.llmCostUsd ?? 0), 0)
  if (total === 0) return ''
  return `$${total.toFixed(4)}`
}

/**
 * Formats a single llmCostUsd value for display in the run detail panel.
 * Returns "—" when null or zero.
 */
export function formatCostValue(cost: number | null | undefined): string {
  if (cost == null || cost === 0) return '—'
  return `$${cost.toFixed(4)}`
}

/**
 * Formats the events breakdown for a run detail panel, e.g. "5 found · 3 inserted · 2 updated".
 * Omits zero-count segments.
 */
export function formatEventsBreakdown(
  eventsFound: number,
  eventsInserted: number,
  eventsUpdated: number,
): string {
  const parts: string[] = []
  if (eventsFound > 0) parts.push(`${eventsFound} found`)
  if (eventsInserted > 0) parts.push(`${eventsInserted} inserted`)
  if (eventsUpdated > 0) parts.push(`${eventsUpdated} updated`)
  return parts.join(' · ') || '0 found'
}
