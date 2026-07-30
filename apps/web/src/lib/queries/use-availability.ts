'use client'

import { useQuery } from '@tanstack/react-query'
import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { publicApiClient } from '@/lib/api'
import { availabilityQueryKey, availabilityPath } from './availability'

function toMap(res: EventsAvailabilityResponse): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of res.data) map.set(row.date, row.count)
  return map
}

interface UseAvailabilityArgs {
  from: string
  to: string
  initialData?: EventsAvailabilityResponse
}

export function useAvailability({
  from,
  to,
  initialData,
}: UseAvailabilityArgs) {
  return useQuery({
    queryKey: availabilityQueryKey(from, to),
    queryFn: async (): Promise<Map<string, number>> => {
      // Anonymous fetch — GET /v1/events/availability is public since #794, and
      // an unauthenticated response stays cacheable by the service worker.
      const res = await publicApiClient.get<EventsAvailabilityResponse>(
        availabilityPath(from, to),
      )
      return toMap(res)
    },
    staleTime: STALE_30_MIN,
    ...(initialData !== undefined ? { initialData: toMap(initialData) } : {}),
  })
}
