'use client'

import { useQuery } from '@tanstack/react-query'
import type { CrawlRun } from '@concert-crawl/types'

const VENUE_RUNS_LIMIT = 25
const STALE_2_MIN = 2 * 60 * 1000

// queryKey includes hasAlert so toggling the page-level filter
// invalidates the cache for this venue and triggers a refetch with the
// new filter applied. Callers that don't care about the filter (e.g.
// useAdminCrawlTrigger invalidating after a re-crawl) can omit the
// second arg — React Query partial-prefix matching means
// `['admin', 'venue-runs', venueId]` invalidates both hasAlert=true and
// hasAlert=false variants for that venue.
export function adminVenueRunsQueryKey(
  venueId: string | null,
): readonly ['admin', 'venue-runs', string | null]
export function adminVenueRunsQueryKey(
  venueId: string | null,
  hasAlert: boolean,
): readonly ['admin', 'venue-runs', string | null, boolean]
export function adminVenueRunsQueryKey(
  venueId: string | null,
  hasAlert?: boolean,
):
  | readonly ['admin', 'venue-runs', string | null]
  | readonly ['admin', 'venue-runs', string | null, boolean] {
  return hasAlert === undefined
    ? (['admin', 'venue-runs', venueId] as const)
    : (['admin', 'venue-runs', venueId, hasAlert] as const)
}

export function useAdminVenueRuns(
  venueId: string | null,
  hasAlert: boolean = false,
) {
  return useQuery({
    queryKey: adminVenueRunsQueryKey(venueId, hasAlert),
    queryFn: async (): Promise<CrawlRun[]> => {
      const params = new URLSearchParams({
        venueId: venueId ?? '',
        limit: String(VENUE_RUNS_LIMIT),
      })
      if (hasAlert) params.set('hasAlert', 'true')
      const res = await fetch(`/api/admin/crawl/runs?${params}`)
      const body = (await res.json()) as { success: boolean; data: CrawlRun[] }
      return body.success ? body.data : []
    },
    enabled: !!venueId,
    staleTime: STALE_2_MIN,
    refetchOnWindowFocus: true,
  })
}
