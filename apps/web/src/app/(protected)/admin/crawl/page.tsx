import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { RefreshCw } from 'lucide-react'
import { SectionHead, AdminButton } from '@/components/admin/primitives'
import { CrawlSplitView } from '@/components/admin/crawl/CrawlSplitView'
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

export default async function AdminCrawlPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [rawStatus, runs] = await Promise.all([
    apiClient.get<RawVenueStatus[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=50', token),
  ])
  const status = rawStatus.map(toStatusRow)

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
      <CrawlSplitView initialStatus={status} initialRuns={runs} />
    </div>
  )
}
