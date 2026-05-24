import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { VenueWithCrawlHealth } from '@concert-crawl/types'
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

  return <VenueDetailsClient venue={venue} />
}
