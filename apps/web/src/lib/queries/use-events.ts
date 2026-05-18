'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsListResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'
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
  const { getToken } = useAuth()

  return useInfiniteQuery({
    queryKey: eventsQueryKey(searchParamsString),
    queryFn: async ({ pageParam }) => {
      const token = await getToken()
      const params = new URLSearchParams(searchParamsString)
      params.set('offset', String(pageParam))
      params.set('limit', String(limit))
      const path = `/v1/events?${params.toString()}`
      return token
        ? apiClient.get<EventsListResponse>(path, token)
        : publicApiClient.get<EventsListResponse>(path)
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
