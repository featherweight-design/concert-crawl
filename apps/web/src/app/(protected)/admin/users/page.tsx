import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives/SectionHead'
import { Panel } from '@/components/admin/primitives/Panel'
import { AdminUsersClient } from '@/components/admin/users/AdminUsersClient'
import type { AdminUserRow } from '@/components/admin/users/AdminUsersClient'
import type { Role } from '@concert-crawl/types'
import { isRole } from '@concert-crawl/types'
import { COPY } from './definitions/copy'

interface AdminUserAPIRow {
  id: string
  email: string
  handle: unknown
  role: unknown
  createdAt: string | null
}

interface AdminUsersResponse {
  data: AdminUserAPIRow[]
  total: number
}

export default async function AdminUsersPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const result = await apiClient
    .get<AdminUsersResponse>('/v1/admin/users?limit=100', token)
    .catch(() => ({ data: [], total: 0 }))

  const users: AdminUserRow[] = result.data.map((row) => ({
    id: row.id,
    email: row.email,
    handle: typeof row.handle === 'string' ? row.handle : null,
    role: isRole(row.role) ? (row.role as Role) : 'user',
    createdAt: row.createdAt,
  }))

  return (
    <>
      <SectionHead
        title={COPY.page.title}
        subtitle={COPY.page.subtitle(result.total)}
      />
      <Panel>
        <AdminUsersClient initialUsers={users} total={result.total} />
      </Panel>
    </>
  )
}
