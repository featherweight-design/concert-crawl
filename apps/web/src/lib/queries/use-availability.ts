'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { availabilityQueryKey, availabilityPath } from './availability'
import { fetchPublicRead } from './public-read'

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
  const { getToken } = useAuth()
  return useQuery({
    queryKey: availabilityQueryKey(from, to),
    queryFn: async (): Promise<Map<string, number>> => {
      const res = await fetchPublicRead<EventsAvailabilityResponse>(
        availabilityPath(from, to),
        getToken,
      )
      return toMap(res)
    },
    staleTime: STALE_30_MIN,
    ...(initialData !== undefined ? { initialData: toMap(initialData) } : {}),
  })
}
