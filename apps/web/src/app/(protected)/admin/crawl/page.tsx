import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { StatCard } from '@/components/admin/primitives'
import {
  CrawlSplitView,
  CrawlRunAllButton,
} from '@/components/admin/crawl/CrawlSplitView'
import { IssuesBanner } from '@/components/admin/crawl/IssuesBanner'
import {
  formatSweepHint,
  formatRunsBreakdown,
  formatLlmCostTotal,
} from './crawl-stats'
import type { CrawlRun } from '@concert-crawl/types'

export interface CrawlStatusRow {
  venueId: string
  venueName: string
  websiteUrl: string
  status: string
  lastRunStatus: string
  lastRunAt: string | null
  eventsFound: number
  eventsInserted: number
  eventsUpdated: number
  llmCostUsd: number | null
  durationMs: number | null
  httpStatusCode: number | null
  consecutiveFailures: number
  blockedAt: string | null
  strategy: string
  error: string | null
}

interface RawVenueStatus {
  id: string
  name: string
  websiteUrl: string
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
    eventsUpdated: number
    llmCostUsd: number | null
    errorMessage: string | null
    extractionStrategyUsed: string | null
    httpStatusCode: number | null
    durationMs: number | null
  } | null
}

function deriveVenueStatus(venue: RawVenueStatus): string {
  if (venue.blockedAt != null) return 'blocked'
  if (!venue.active) return 'paused'
  return venue.lastRun?.status ?? 'never'
}

function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    websiteUrl: venue.websiteUrl,
    status: deriveVenueStatus(venue),
    lastRunStatus: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    eventsInserted: venue.lastRun?.eventsInserted ?? 0,
    eventsUpdated: venue.lastRun?.eventsUpdated ?? 0,
    llmCostUsd: venue.lastRun?.llmCostUsd ?? null,
    durationMs: venue.lastRun?.durationMs ?? null,
    httpStatusCode: venue.lastRun?.httpStatusCode ?? null,
    consecutiveFailures: venue.consecutiveFailures,
    blockedAt: venue.blockedAt,
    strategy: venue.lastRun?.extractionStrategyUsed ?? '—',
    error: venue.lastRun?.errorMessage ?? null,
  }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCrawlPage({ searchParams }: Props) {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const resolvedParams = await searchParams
  const rawVenueId = resolvedParams.venueId
  const initialVenueId =
    (Array.isArray(rawVenueId) ? rawVenueId[0] : rawVenueId) || undefined

  const [rawStatus, runs] = await Promise.all([
    apiClient.get<RawVenueStatus[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=50', token),
  ])
  const status = rawStatus.map(toStatusRow)
  const todayStrMT = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Denver',
  })
  const todayRuns = runs.filter(
    (run) =>
      new Date(run.createdAt).toLocaleDateString('en-US', {
        timeZone: 'America/Denver',
      }) === todayStrMT,
  )

  const sweepHint = formatSweepHint(todayRuns)
  const runsBreakdown = formatRunsBreakdown(todayRuns)
  const totalInserted = todayRuns.reduce(
    (sum, run) => sum + run.eventsInserted,
    0,
  )
  const totalUpdated = todayRuns.reduce(
    (sum, run) => sum + run.eventsUpdated,
    0,
  )
  const eventsHintParts: string[] = []
  if (totalInserted > 0) eventsHintParts.push(`${totalInserted} new`)
  if (totalUpdated > 0) eventsHintParts.push(`${totalUpdated} updated`)
  const eventsHint = eventsHintParts.join(' · ') || 'today'

  const mostRecentRun = runs[0]
  const lastSweepValue = mostRecentRun?.createdAt
    ? `${String(Math.round((Date.now() - new Date(mostRecentRun.createdAt).getTime()) / 60000))}m ago`
    : '—'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--fg)',
              margin: 0,
            }}
          >
            Crawl status
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--fg-muted)',
              margin: '4px 0 0',
            }}
          >
            Every venue crawl, run by run. The dataset is only as fresh as this
            page.
          </p>
        </div>
        <CrawlRunAllButton />
      </div>

      <IssuesBanner
        blockedVenues={status.filter(
          (row) =>
            row.status === 'blocked' ||
            row.status === 'failed' ||
            row.status === 'paused',
        )}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Last sweep"
          value={lastSweepValue}
          iconName="RefreshCw"
          kind="neutral"
          hint={sweepHint}
        />
        <StatCard
          label="Today's runs"
          value={String(todayRuns.length)}
          iconName="Activity"
          kind="signal"
          hint={runsBreakdown}
        />
        <StatCard
          label="Events ingested"
          value={String(totalInserted + totalUpdated)}
          iconName="CalendarCheck2"
          kind="success"
          hint={eventsHint}
        />
        <StatCard
          label="LLM cost · today"
          value={formatLlmCostTotal(todayRuns) || '$0.00'}
          iconName="DollarSign"
          kind="signal"
        />
      </div>

      <CrawlSplitView
        initialStatus={status}
        initialRuns={runs}
        {...(initialVenueId !== undefined && {
          initialSelectedId: initialVenueId,
        })}
      />
    </div>
  )
}
