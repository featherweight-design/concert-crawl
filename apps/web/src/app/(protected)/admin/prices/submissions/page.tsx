import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { PricesSubmissionsClient } from '@/components/admin/prices/PricesSubmissionsClient'
import { type PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions'
import { FETCH_PAGE_SIZE } from '@/lib/queries/admin-price-submissions.constants'

interface CountedResponse {
  rows: PriceSubmissionHistoryRow[]
  total: number
}

export default async function PricesSubmissionsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // First-paint seed: the client hook re-fetches the whole set (walking
  // offsets) so filtering/sorting/pagination can run in the browser. This
  // first page just gives the table something to render immediately. Share
  // FETCH_PAGE_SIZE with the walker so the seed and offset steps can't drift.
  const initial = await apiClient
    .get<CountedResponse>(
      `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=0`,
      token,
    )
    .catch(() => ({ rows: [], total: 0 }) as CountedResponse)

  return (
    <PricesSubmissionsClient
      initialSubmissions={initial.rows}
      initialTotal={initial.total}
    />
  )
}
