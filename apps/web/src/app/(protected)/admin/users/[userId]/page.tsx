import { notFound } from 'next/navigation'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient, ApiError } from '@/lib/api'
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
  // A missing token is a recoverable auth hiccup, not a 404 — render the
  // banner (user={null}) rather than a blank page.
  if (!token) return <UserDetailClient user={null} />

  // A real 404 is a bad/stale id — render Next's notFound() shell. Any other
  // failure (API down, token issue) falls back to the recoverable banner.
  const user = await apiClient
    .get<AdminUserDetail>(
      `/v1/admin/users/${encodeURIComponent(userId)}`,
      token,
    )
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound()
      return null
    })

  return <UserDetailClient user={user} />
}
