import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { VenueWithCrawlHealth, CrawlRun } from '@concert-crawl/types'
import { VenueDetailsClient } from '@/components/admin/VenueDetailsClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VenueDetailPage({ params }: Props) {
  await requireAdminUser()
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  let venue: VenueWithCrawlHealth
  try {
    venue = await apiClient.get<VenueWithCrawlHealth>(
      `/v1/admin/venues/${id}`,
      token,
    )
  } catch {
    notFound()
  }

  let recentRuns: CrawlRun[] = []
  try {
    recentRuns = await apiClient.get<CrawlRun[]>(
      `/v1/admin/crawl/runs?venueId=${id}&limit=3`,
      token,
    )
  } catch {
    // Non-fatal — page still renders without recent runs
  }

  return <VenueDetailsClient venue={venue} recentRuns={recentRuns} />
}
