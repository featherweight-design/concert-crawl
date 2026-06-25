import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { StatCard, SectionHead } from '@/components/admin/primitives'
import {
  CrawlSplitView,
  CrawlRunAllButton,
} from '@/components/admin/crawl/CrawlSplitView'
import { CrawlAlertFilter } from '@/components/admin/crawl/CrawlAlertFilter'
import { IssuesBanner } from '@/components/admin/crawl/IssuesBanner'
import {
  formatSweepHint,
  formatRunsBreakdown,
  formatLlmCostTotal,
} from './crawl-stats'
import type { CrawlRun } from '@concert-crawl/types'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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
  if (venue.blockedAt != null && venue.lastRun?.status !== 'success')
    return 'blocked'
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
  const rawTab = resolvedParams.tab
  const initialTab = (Array.isArray(rawTab) ? rawTab[0] : rawTab) || undefined
  // #804: when `?hasAlert=true` is in the URL, narrow the runs list to only
  // those carrying an unread admin_alert. The filter UI in the page header
  // toggles this param via Next.js navigation; the server component
  // re-renders without needing client state. We also collect the OTHER
  // search params (venueId, tab) so the filter's hrefs preserve them —
  // toggling the filter shouldn't clobber the operator's current venue
  // selection or active inspector tab.
  const rawHasAlert = resolvedParams.hasAlert
  const hasAlertParam = Array.isArray(rawHasAlert)
    ? rawHasAlert[0]
    : rawHasAlert
  const hasAlertOnly = hasAlertParam === 'true'

  const otherSearchParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (key === 'hasAlert' || value === undefined) continue
    otherSearchParams[key] = Array.isArray(value) ? (value[0] ?? '') : value
  }

  const runsUrl = hasAlertOnly
    ? '/v1/admin/crawl/runs?limit=50&hasAlert=true'
    : '/v1/admin/crawl/runs?limit=50'

  const [rawStatus, runs] = await Promise.all([
    apiClient.get<RawVenueStatus[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>(runsUrl, token),
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
  const eventsHint =
    eventsHintParts.join(' · ') || ADMIN_COPY.crawlPage.statEventsHintFallback

  const mostRecentRun = runs[0]
  const lastSweepMinutes = mostRecentRun?.createdAt
    ? Math.round(
        (Date.now() - new Date(mostRecentRun.createdAt).getTime()) / 60000,
      )
    : null
  let lastSweepValue = '—'
  if (lastSweepMinutes !== null) {
    if (lastSweepMinutes >= 60) {
      const hours = Math.floor(lastSweepMinutes / 60)
      const mins = lastSweepMinutes % 60
      lastSweepValue = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    } else {
      lastSweepValue = `${lastSweepMinutes}m`
    }
  }
  const lastSweepUnit = lastSweepMinutes !== null ? 'ago' : undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <SectionHead
        eyebrow={ADMIN_COPY.crawlPage.sectionEyebrow}
        title={ADMIN_COPY.crawlPage.sectionTitle}
        subtitle={ADMIN_COPY.crawlPage.sectionSubtitle}
        actions={
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <CrawlAlertFilter
              hasAlert={hasAlertOnly}
              otherParams={otherSearchParams}
            />
            <CrawlRunAllButton />
          </div>
        }
      />

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <StatCard
          label={ADMIN_COPY.crawlPage.statLastSweep}
          value={lastSweepValue}
          {...(lastSweepUnit !== undefined && {
            unit: ADMIN_COPY.crawlPage.statLastSweepUnit,
          })}
          iconName="RefreshCw"
          kind="neutral"
          hint={sweepHint}
        />
        <StatCard
          label={ADMIN_COPY.crawlPage.statTodaysRuns}
          value={String(todayRuns.length)}
          iconName="Activity"
          kind="signal"
          hint={runsBreakdown}
        />
        <StatCard
          label={ADMIN_COPY.crawlPage.statEventsIngested}
          value={String(totalInserted + totalUpdated)}
          unit={ADMIN_COPY.crawlPage.statEventsIngestedUnit}
          iconName="CalendarCheck2"
          kind="success"
          hint={eventsHint}
        />
        <StatCard
          label={ADMIN_COPY.crawlPage.statLlmCost}
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
        {...(initialTab === 'history' && { initialTab: 'history' })}
      />
    </div>
  )
}
