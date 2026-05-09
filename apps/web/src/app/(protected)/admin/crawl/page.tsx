import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { RefreshCw } from 'lucide-react'
import {
  SectionHead,
  AdminButton,
  StatCard,
} from '@/components/admin/primitives'
import { CrawlSplitView } from '@/components/admin/crawl/CrawlSplitView'
import { IssuesBanner } from '@/components/admin/crawl/IssuesBanner'
import type { CrawlRun } from '@concert-crawl/types'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  strategy: string
  cost: number
  error: string | null
}

interface RawVenueStatus {
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

function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    status: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    strategy: venue.lastRun?.extractionStrategyUsed ?? '—',
    cost: 0,
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
  const todayStr = new Date().toDateString()
  const todayRuns = runs.filter(
    (run) => new Date(run.createdAt).toDateString() === todayStr,
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100%',
      }}
    >
      <SectionHead
        eyebrow="Phase 7 · Automation"
        title="Crawl status"
        actions={
          <>
            <AdminButton variant="outline" icon={RefreshCw}>
              Run all
            </AdminButton>
          </>
        }
      />

      <IssuesBanner
        blockedVenues={status.filter(
          (row) => row.status === 'blocked' || row.status === 'failed',
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
          value={
            runs[0]?.startedAt
              ? `${String(Math.round((Date.now() - new Date(runs[0].startedAt).getTime()) / 60000))}m ago`
              : '—'
          }
          iconName="RefreshCw"
          kind="neutral"
        />
        <StatCard
          label="Today's runs"
          value={String(todayRuns.length)}
          iconName="Activity"
          kind="signal"
        />
        <StatCard
          label="Events ingested"
          value={String(
            todayRuns.reduce((sum, run) => sum + run.eventsInserted, 0),
          )}
          iconName="CheckSquare"
          kind="success"
          hint="today"
        />
        <StatCard
          label="LLM cost · today"
          value={`$${todayRuns.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0).toFixed(2)}`}
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
