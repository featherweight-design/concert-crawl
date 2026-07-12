'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

// Full submission history row — the /v1/admin/prices/submissions endpoint
// shape when ?status=all is passed. Contest counter rows are excluded server
// side (they're owned by /v1/admin/contests/prices), so disputedSubmissionId
// is always null here but surfaced on the wire.
export interface PriceSubmissionHistoryRow {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  status: string
  disputedSubmissionId: string | null
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

interface CountedResponse {
  rows: PriceSubmissionHistoryRow[]
  total: number
}

// The endpoint caps `limit` at 100, so the history page loads the whole set by
// walking offsets until it has `total` rows. Filtering, sorting and pagination
// all run client-side (the endpoint only orders by createdAt desc and filters
// pending|all), so the full set has to be in the browser. For beta volumes this
// resolves in a single request.
const FETCH_PAGE_SIZE = 100

export const adminPriceSubmissionsKey = [
  'admin',
  'prices',
  'submissions',
  'history',
] as const

async function fetchAllSubmissions(
  token: string,
): Promise<PriceSubmissionHistoryRow[]> {
  const first = await apiClient.get<CountedResponse>(
    `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=0`,
    token,
  )
  const rows = [...first.rows]
  let offset = FETCH_PAGE_SIZE
  while (offset < first.total) {
    const next = await apiClient.get<CountedResponse>(
      `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=${offset}`,
      token,
    )
    if (next.rows.length === 0) break
    rows.push(...next.rows)
    offset += FETCH_PAGE_SIZE
  }
  return rows
}

export function useAdminPriceSubmissions(
  initialData?: PriceSubmissionHistoryRow[],
) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminPriceSubmissionsKey,
    queryFn: async (): Promise<PriceSubmissionHistoryRow[]> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchAllSubmissions(token)
    },
    // The SSR seed is only the first page; the global 30-min staleTime would
    // otherwise treat initialData as fresh and never walk the remaining
    // offsets, leaving client-side filter/sort/paginate on a partial set.
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useInvalidateAdminPriceSubmissions() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: adminPriceSubmissionsKey })
}
