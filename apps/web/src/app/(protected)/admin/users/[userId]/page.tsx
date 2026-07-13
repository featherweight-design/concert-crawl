import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { AdminUserDetail } from '@concert-crawl/types'
import { UserDetailClient } from '@/components/admin/users/UserDetailClient'

interface PageProps {
  // Next 15 App Router — dynamic params arrive as a Promise (awaited below).
  params: Promise<{ userId: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireAdminUser()
  const { userId } = await params
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const user = await apiClient
    .get<AdminUserDetail>(
      `/v1/admin/users/${encodeURIComponent(userId)}`,
      token,
    )
    .catch(() => null)

  return <UserDetailClient user={user} />
}
