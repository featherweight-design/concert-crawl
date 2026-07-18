'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsListResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { fetchPublicRead } from './public-read'

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
  const { getToken } = useAuth()
  return useInfiniteQuery({
    queryKey: eventsQueryKey(searchParamsString),
    // Fetch anonymously first even when signed in: the /v1/events list route is
    // fully public (no clerkMiddleware — it reads no per-user fields), so an
    // anonymous request returns identical data AND stays cacheable by the
    // service worker, which refuses to cache credentialed responses. That keeps
    // offline browsing working for the (default, protected) signed-in case.
    // When the API is beta-gated (REQUIRE_BETA_AUTH), the anonymous request
    // 401s and fetchPublicRead retries with a token so the UI still works.
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(searchParamsString)
      params.set('offset', String(pageParam))
      params.set('limit', String(limit))
      const path = `/v1/events?${params.toString()}`
      return fetchPublicRead<EventsListResponse>(path, getToken)
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
