'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsListResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { apiClient } from '@/lib/api'
import { fetchPublicRead } from './public-read'
import { useSpotifyConnection } from './use-spotify-connection'

export function eventsQueryKey(paramsString: string, hasTaste: boolean) {
  return ['events', paramsString, hasTaste] as const
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
  // The /v1/events list route personalizes for viewers with Spotify taste rows
  // (#763 PR 6: optional followedArtists per event). Only those viewers need a
  // credentialed fetch — everyone else keeps the anonymous request so the
  // service worker can cache the response for offline browsing (it refuses to
  // cache credentialed responses). `error`-status connections still retain
  // follow rows server-side, so they count as having taste; `revoked` purges
  // rows, so it does not. artistCount is the persisted count of those rows
  // from the last sync — a connection with zero taste rows gets no
  // followedArtists from the API, so it keeps the cacheable anonymous fetch.
  const { data: connection } = useSpotifyConnection()
  const hasTaste =
    connection != null &&
    (connection.status === 'connected' || connection.status === 'error') &&
    connection.artistCount > 0
  return useInfiniteQuery({
    // hasTaste is part of the key so pages fetched anonymously before the
    // connection query resolves aren't reused for the personalized view.
    queryKey: eventsQueryKey(searchParamsString, hasTaste),
    // Fetch anonymously when the viewer has no Spotify taste: an anonymous
    // request returns identical data AND stays cacheable by the service
    // worker, which keeps offline browsing working for the (default,
    // protected) signed-in case. When the API is beta-gated
    // (REQUIRE_BETA_AUTH), the anonymous request 401s and fetchPublicRead
    // retries with a token so the UI still works.
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(searchParamsString)
      params.set('offset', String(pageParam))
      params.set('limit', String(limit))
      const path = `/v1/events?${params.toString()}`
      if (hasTaste) {
        const token = await getToken()
        if (token) return apiClient.get<EventsListResponse>(path, token)
      }
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
