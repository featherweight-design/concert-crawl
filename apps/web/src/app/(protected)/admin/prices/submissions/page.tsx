import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { PricesSubmissionsClient } from '@/components/admin/prices/PricesSubmissionsClient'
import { type PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions'

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
  // 100-row page just gives the table something to render immediately.
  const initial = await apiClient
    .get<CountedResponse>(
      '/v1/admin/prices/submissions?status=all&count=true&limit=100&offset=0',
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
