import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
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

export default async function AdminCrawlPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [status, runs] = await Promise.all([
    apiClient.get<CrawlStatusRow[]>('/v1/admin/crawl/status', token),
    apiClient.get<CrawlRun[]>('/v1/admin/crawl/runs?limit=50', token),
  ])

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
      <CrawlSplitView initialStatus={status} initialRuns={runs} token={token} />
    </div>
  )
}
