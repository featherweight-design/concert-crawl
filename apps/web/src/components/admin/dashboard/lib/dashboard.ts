import type { CrawlRun, DailyCost, Event, Venue } from '@concert-crawl/types'

export const LLM_BUDGET_USD = 20

// Week-over-week LLM spend trend, shared by the CostPanel wow badge and the
// "LLM cost" StatCard so the two surfaces always agree.
export interface CostTrend {
  dir: 'up' | 'down'
  text: string
  good: boolean
}

// Week-over-week delta from the daily-costs series: last 7 days vs the prior
// 7. `days` is the zero-filled, oldest→newest series from
// GET /v1/admin/costs/daily. Undefined when the prior window has no spend —
// a percentage against $0 is meaningless, so callers omit the badge/trend.
export function computeWowTrend(days: DailyCost[]): CostTrend | undefined {
  const sumWindow = (window: DailyCost[]) =>
    window.reduce((sum, day) => sum + day.costUsd, 0)
  const recent = sumWindow(days.slice(-7))
  const prior = sumWindow(days.slice(-14, -7))
  if (prior <= 0) return undefined
  const pctChange = Math.round(((recent - prior) / prior) * 100)
  return {
    dir: recent > prior ? 'up' : 'down',
    text: `${pctChange > 0 ? '+' : ''}${pctChange}%`,
    good: recent <= prior,
  }
}

// Evenly spaced axis labels ("JUL 7" style) for the cost chart, derived from
// the zero-filled daily series. Dates are data, not copy — formatting lives
// here rather than in definitions/copy.ts. Parsed at UTC midnight so the
// YYYY-MM-DD string renders as the same calendar day regardless of the
// server's timezone.
export function buildCostAxisLabels(
  days: DailyCost[],
  tickCount = 5,
): string[] {
  if (days.length === 0) return []
  const count = Math.min(tickCount, days.length)
  const labels: string[] = []
  for (let tick = 0; tick < count; tick++) {
    const idx =
      count > 1 ? Math.round((tick * (days.length - 1)) / (count - 1)) : 0
    const day = days[idx]
    if (!day) continue
    labels.push(
      new Date(`${day.date}T00:00:00Z`)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
        .toUpperCase(),
    )
  }
  return labels
}

export interface RawVenueStatus {
  id: string
  name: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: {
    id: string
    venueId: string
    status: string
    createdAt: string
    eventsFound: number
    eventsInserted: number
    errorMessage: string | null
    extractionStrategyUsed: string | null
  } | null
}

export interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  strategy: string | null
  cost: number
  error: string | null
  consecutiveFailures: number
  blockedAt: string | null
}

export function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    status: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    strategy: venue.lastRun?.extractionStrategyUsed ?? null,
    cost: 0,
    error: venue.lastRun?.errorMessage ?? null,
    consecutiveFailures: venue.consecutiveFailures,
    blockedAt: venue.blockedAt,
  }
}

export function formatStrategy(strategy: string | null): string {
  if (strategy === 'structured_data') return 'structured'
  if (strategy === 'llm') return 'llm'
  if (strategy === 'manual') return 'manual'
  return '—'
}

// Returns "Bluebird (5), Gothic (4), Ogden (3)" for top-3 venues by pending event count
export function buildPendingReviewHint(
  events: Event[],
  venues: Venue[],
): string {
  const countsByVenueId = new Map<string, number>()
  for (const evt of events) {
    countsByVenueId.set(
      evt.venueId,
      (countsByVenueId.get(evt.venueId) ?? 0) + 1,
    )
  }

  const venueNameById = new Map(venues.map((venue) => [venue.id, venue.name]))

  const sorted = [...countsByVenueId.entries()]
    .sort((aa, bb) => bb[1] - aa[1])
    .slice(0, 3)

  return sorted
    .map(
      ([venueId, count]) =>
        `${venueNameById.get(venueId) ?? venueId} (${count})`,
    )
    .join(', ')
}

function ordinal(nn: number): string {
  const abs = Math.abs(nn)
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) return `${nn}th`
  const mod10 = abs % 10
  if (mod10 === 1) return `${nn}st`
  if (mod10 === 2) return `${nn}nd`
  if (mod10 === 3) return `${nn}rd`
  return `${nn}th`
}

// Returns a hint string for the crawl health card
// "{venueName} blocked · {N}th failure" if any blocked (picks worst)
// Or venue with most consecutive failures if any failing
// Or empty string if all healthy
export function buildCrawlHealthHint(rows: CrawlStatusRow[]): string {
  const blockedRows = rows.filter((row) => row.blockedAt !== null)
  if (blockedRows.length > 0) {
    const worst = blockedRows.reduce((aa, bb) =>
      bb.consecutiveFailures > aa.consecutiveFailures ? bb : aa,
    )
    const failureSuffix =
      worst.consecutiveFailures > 0
        ? ` · ${ordinal(worst.consecutiveFailures)} failure`
        : ''
    return `${worst.venueName} blocked${failureSuffix}`
  }

  const mostFailing = rows
    .filter((row) => row.consecutiveFailures > 0)
    .sort((aa, bb) => bb.consecutiveFailures - aa.consecutiveFailures)[0]

  if (mostFailing) {
    return `${mostFailing.venueName} · ${ordinal(mostFailing.consecutiveFailures)} failure`
  }

  return ''
}

// Returns "X paused · Y blocked · +Z this week"
// Paused = active === false && blockedAt === null
// Blocked = blockedAt !== null
// This week = createdAt within last 7 days
export function buildActiveVenuesHint(venues: Venue[]): string {
  const now = Date.now()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  const paused = venues.filter(
    (venue) => !venue.active && venue.blockedAt === null,
  ).length
  const blocked = venues.filter((venue) => venue.blockedAt !== null).length
  const addedThisWeek = venues.filter(
    (venue) => now - new Date(venue.createdAt).getTime() < sevenDaysMs,
  ).length

  const parts: string[] = []
  if (paused > 0) parts.push(`${paused} paused`)
  if (blocked > 0) parts.push(`${blocked} blocked`)
  if (addedThisWeek > 0) parts.push(`+${addedThisWeek} this week`)

  return parts.join(' · ')
}

// Returns array of 1 (healthy) or 0 (failure) for last 8 runs, oldest→newest order.
// 'skipped' counts as healthy alongside 'success' — it's a page-hash dedup
// outcome, not a failure.
// Input is already sorted descending — take first 8 then reverse so sparkline reads left→right
export function buildSparklineData(runs: CrawlRun[]): number[] {
  return runs
    .slice(0, 8)
    .reverse()
    .map((run) =>
      run.status === 'success' || run.status === 'skipped' ? 1 : 0,
    )
}
