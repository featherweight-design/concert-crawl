'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { FETCH_PAGE_SIZE } from './admin-price-submissions.constants'

// Mirrors packages/db price_submission_status enum — the UI treats status as a
// closed set (STATUS_KIND / statusLabels), so keep this union in sync with it.
export type PriceSubmissionStatus =
  'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'

// Full submission history row — the /v1/admin/prices/submissions endpoint
// shape when ?status=all is passed. Contest counter rows are excluded server
// side (they're owned by /v1/admin/contests/prices), so disputedSubmissionId
// is always null here but surfaced on the wire.
export interface PriceSubmissionHistoryRow {
  id: string
  eventId: string
  // Nullable on the wire: anonymous submissions have no user_id (the column is
  // nullable in packages/db). userDisplay/sort already treat null as anon.
  userId: string | null
  priceMin: string | null
  priceMax: string | null
  status: PriceSubmissionStatus
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
// resolves in a single request. FETCH_PAGE_SIZE lives in a server-safe module
// so the SSR seed can share it without importing from this client module.

export const adminPriceSubmissionsKey = [
  'admin',
  'prices',
  'submissions',
  'history',
] as const

async function fetchAllSubmissions(
  token: string,
): Promise<PriceSubmissionHistoryRow[]> {
  // Only the first request asks for count=true — the extra count(*) is wasted
  // work on every subsequent page since `total` is already known. Later pages
  // fetch without count and return a bare rows array.
  const first = await apiClient.get<CountedResponse>(
    `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=0`,
    token,
  )
  const rows = [...first.rows]
  // Advance by the rows actually received, not the requested page size: a
  // short (non-empty) page would otherwise skip the records between
  // offset+received and offset+FETCH_PAGE_SIZE.
  let offset = first.rows.length
  while (rows.length < first.total) {
    const next = await apiClient.get<PriceSubmissionHistoryRow[]>(
      `/v1/admin/prices/submissions?status=all&limit=${FETCH_PAGE_SIZE}&offset=${offset}`,
      token,
    )
    if (next.length === 0) break
    rows.push(...next)
    offset += next.length
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
    // The SSR seed is only the first page. Marking it stale (updatedAt: 0)
    // makes React Query refetch on mount and walk the remaining offsets, so
    // client-side filter/sort/paginate runs on the full set rather than being
    // stranded on the first page by the global 30-min staleTime.
    ...(initialData ? { initialData, initialDataUpdatedAt: 0 } : {}),
  })
}

export function useInvalidateAdminPriceSubmissions() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: adminPriceSubmissionsKey })
}
