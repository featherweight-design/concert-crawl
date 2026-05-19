'use client'

import { useQuery } from '@tanstack/react-query'
import type { CrawlRun } from '@concert-crawl/types'

const VENUE_RUNS_LIMIT = 25
const STALE_2_MIN = 2 * 60 * 1000

export const adminVenueRunsQueryKey = (venueId: string | null) =>
  ['admin', 'venue-runs', venueId] as const

export function useAdminVenueRuns(venueId: string | null) {
  return useQuery({
    queryKey: adminVenueRunsQueryKey(venueId),
    queryFn: async (): Promise<CrawlRun[]> => {
      const res = await fetch(
        `/api/admin/crawl/runs?venueId=${venueId}&limit=${VENUE_RUNS_LIMIT}`,
      )
      const body = (await res.json()) as { success: boolean; data: CrawlRun[] }
      return body.success ? body.data : []
    },
    enabled: !!venueId,
    staleTime: STALE_2_MIN,
    refetchOnWindowFocus: true,
  })
}
