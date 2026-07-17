'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsAvailabilityResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'
import { STALE_30_MIN } from '@/lib/query-client'

export function availabilityQueryKey(from: string, to: string) {
  return ['availability', from, to] as const
}

export async function fetchAvailability(
  from: string,
  to: string,
  token: string | null,
): Promise<EventsAvailabilityResponse> {
  const url = `/v1/events/availability?from=${from}&to=${to}`
  return token
    ? apiClient.get<EventsAvailabilityResponse>(url, token)
    : publicApiClient.get<EventsAvailabilityResponse>(url)
}

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
      const token = await getToken()
      const res = await fetchAvailability(from, to, token)
      return toMap(res)
    },
    staleTime: STALE_30_MIN,
    ...(initialData !== undefined ? { initialData: toMap(initialData) } : {}),
  })
}
