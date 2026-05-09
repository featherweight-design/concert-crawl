import type { CrawlRun, Event, Venue } from '@concert-crawl/types'

export const LLM_BUDGET_USD = 40

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

// Returns a hint string for the crawl health card
// "{venueName} blocked · {N}rd failure" if any blocked
// Or venue with most consecutive failures if any failing
// Or empty string if all healthy
export function buildCrawlHealthHint(rows: CrawlStatusRow[]): string {
  const blocked = rows.find((row) => row.blockedAt !== null)
  if (blocked) {
    const failures = blocked.consecutiveFailures
    const suffix =
      failures === 1
        ? 'st'
        : failures === 2
          ? 'nd'
          : failures === 3
            ? 'rd'
            : 'th'
    return `${blocked.venueName} blocked · ${failures}${suffix} failure`
  }

  const mostFailing = rows
    .filter((row) => row.consecutiveFailures > 0)
    .sort((aa, bb) => bb.consecutiveFailures - aa.consecutiveFailures)[0]

  if (mostFailing) {
    const failures = mostFailing.consecutiveFailures
    const suffix =
      failures === 1
        ? 'st'
        : failures === 2
          ? 'nd'
          : failures === 3
            ? 'rd'
            : 'th'
    return `${mostFailing.venueName} · ${failures}${suffix} failure`
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

// Returns array of 1 (success) or 0 (failure) for last 8 runs, sorted by createdAt DESC
// Input is already sorted descending — take first 8
export function buildSparklineData(runs: CrawlRun[]): number[] {
  return runs.slice(0, 8).map((run) => (run.status === 'success' ? 1 : 0))
}
