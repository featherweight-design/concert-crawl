'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import type { EventsListResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { STALE_30_MIN } from '@/lib/query-client'

export function eventsQueryKey(paramsString: string) {
  return ['events', paramsString] as const
}

interface UseEventsOptions {
  searchParamsString: string // URLSearchParams serialized (without offset)
  limit: number
  initialData?: EventsListResponse
  initialOffset?: number
}

export function useEvents({
  searchParamsString,
  limit,
  initialData,
  initialOffset = 0,
}: UseEventsOptions) {
  return useInfiniteQuery({
    queryKey: eventsQueryKey(searchParamsString),
    // Fetch WITHOUT auth even when signed in: the /v1/events list route is
    // fully public (no clerkMiddleware — it reads no per-user fields), so an
    // anonymous request returns identical data. Sending Authorization would
    // make the service worker refuse to cache it, breaking offline browsing of
    // the events list for the (default, protected) signed-in case.
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(searchParamsString)
      params.set('offset', String(pageParam))
      params.set('limit', String(limit))
      const path = `/v1/events?${params.toString()}`
      return publicApiClient.get<EventsListResponse>(path)
    },
    initialPageParam: initialOffset,
    getNextPageParam: (lastPage: EventsListResponse) => {
      const nextOffset = lastPage.offset + lastPage.limit
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
    // Spread conditional to avoid passing `initialData: undefined` with exactOptionalPropertyTypes
    ...(initialData
      ? {
          initialData: {
            pages: [initialData],
            pageParams: [initialOffset],
          },
        }
      : {}),
    staleTime: STALE_30_MIN,
  })
}
