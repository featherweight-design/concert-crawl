import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { VenueRobotsStatus } from '@concert-crawl/types'
import { RobotsAuditClient } from '@/components/admin/venues/RobotsAuditClient'

export default async function RobotsAuditPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const venues = await apiClient
    .get<VenueRobotsStatus[]>('/v1/admin/venues/robots-audit', token)
    .catch(() => null)

  return <RobotsAuditClient venues={venues} />
}
