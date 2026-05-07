import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { CrawlStatusTable } from '@/components/admin/crawl-status-table/CrawlStatusTable'

type CrawlStatusRow = {
  id: string
  name: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: {
    id: string
    status: string
    createdAt: string
    eventsFound: number
    eventsInserted: number
    errorMessage: string | null
    extractionStrategyUsed: string | null
  } | null
}

async function getCrawlStatus(): Promise<CrawlStatusRow[]> {
  const { getToken } = await auth()
  const token = await getToken()
  return apiClient.get<CrawlStatusRow[]>('/v1/admin/crawl/status', token!)
}

export default async function CrawlStatusPage() {
  const venues = await getCrawlStatus()

  const totalVenues = venues.length
  const failing = venues.filter(
    (venue) => venue.consecutiveFailures >= 1,
  ).length
  const blocked = venues.filter((venue) => venue.blockedAt !== null).length
  const neverCrawled = venues.filter((venue) => venue.lastRun === null).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Crawl Status</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Daily crawl health for all active venues.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total venues', value: totalVenues },
          { label: 'Failing', value: failing, danger: failing > 0 },
          { label: 'Blocked', value: blocked, danger: blocked > 0 },
          { label: 'Never crawled', value: neverCrawled },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface-1 p-4"
          >
            <p className="text-sm text-fg-muted">{stat.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                stat.danger ? 'text-red-500' : 'text-fg'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <CrawlStatusTable venues={venues} />
    </div>
  )
}
