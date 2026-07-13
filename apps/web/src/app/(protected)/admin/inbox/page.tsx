import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { AdminInboxClient } from '@/components/admin/inbox/AdminInboxClient'
import { INBOX_PAGE_SIZE } from '@/lib/queries/use-admin-inbox'
import type { InboxResponse } from '@concert-crawl/types'

// Empty fallback so a first-paint API error never breaks the route — the client
// hook re-fetches on mount and surfaces the load/auth error banner if it fails.
const EMPTY_INBOX: InboxResponse = {
  items: [],
  total: 0,
  unreadCounts: {
    event_flag: 0,
    price_submission: 0,
    blocked_venue: 0,
    crawl_failure: 0,
  },
}

export default async function AdminInboxPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // Seed the default view (unread, all categories, first page) so the table
  // paints immediately. The client re-fetches on mount and drives filters +
  // pagination from there.
  const initialData = await apiClient
    .get<InboxResponse>(
      `/v1/admin/inbox?status=unread&count=true&limit=${INBOX_PAGE_SIZE}&offset=0`,
      token,
    )
    .catch(() => EMPTY_INBOX)

  return <AdminInboxClient initialData={initialData} />
}
