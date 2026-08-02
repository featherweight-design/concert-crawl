import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { VenueGuide, VenueWithCrawlHealth } from '@concert-crawl/types'
import { VenueDetailsClient } from '@/components/admin/VenueDetailsClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_GUIDE: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
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

  // #764 — a guide fetch failure must not take down the whole venue page; the
  // block falls back to an empty draft the admin can still author into.
  let guide: VenueGuide = EMPTY_GUIDE
  try {
    guide = await apiClient.get<VenueGuide>(
      `/v1/admin/venues/${id}/guide`,
      token,
    )
  } catch (err: unknown) {
    console.error('VenueDetailPage: could not load the first-timer guide', {
      id,
      err,
    })
  }

  return <VenueDetailsClient venue={venue} guide={guide} />
}
