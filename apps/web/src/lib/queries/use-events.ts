'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsListResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { apiClient, ApiError } from '@/lib/api'
import { fetchPublicRead } from './public-read'
import { useSpotifyConnection } from './use-spotify-connection'

// personalizedFor is the viewer's userId when the response carries their
// followedArtists overlay, null for the shared anonymous shape. Scoping the
// personalized entry by userId matters because the app-level QueryClient
// outlives sign-in sessions — an account switch must not briefly serve the
// previous user's followedArtists (same reasoning as planStateQueryKey).
export function eventsQueryKey(
  paramsString: string,
  personalizedFor: string | null,
) {
  return ['events', paramsString, personalizedFor] as const
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
  const { getToken, userId } = useAuth()
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
  // Taste filter (#763 PR 7): filterTaste=1 in the page URL maps to the API's
  // taste=1 param, which requires a token + the spotify-sync entitlement.
  // Logged-out viewers can't hold the entitlement (the chip is locked for
  // them), so a filterTaste URL without a userId is a tampered/stale link —
  // drop the flag and fetch the plain list.
  const tasteRequested =
    new URLSearchParams(searchParamsString).get('filterTaste') === '1' &&
    userId != null
  const personalizedFor =
    (hasTaste || tasteRequested) && userId != null ? userId : null
  return useInfiniteQuery({
    // personalizedFor is part of the key so pages fetched anonymously before
    // the connection query resolves aren't reused for the personalized view,
    // and personalized pages are never shared across viewers.
    queryKey: eventsQueryKey(searchParamsString, personalizedFor),
    // Fetch anonymously when the viewer has no Spotify taste: an anonymous
    // request returns identical data AND stays cacheable by the service
    // worker, which keeps offline browsing working for the (default,
    // protected) signed-in case. When the API is beta-gated
    // (REQUIRE_BETA_AUTH), the anonymous request 401s and fetchPublicRead
    // retries with a token so the UI still works.
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams(searchParamsString)
      // filterTaste is a page-URL param, not an API one — swap it for the
      // API's taste=1 (credentialed viewers only; see tasteRequested above).
      params.delete('filterTaste')
      if (tasteRequested) params.set('taste', '1')
      params.set('offset', String(pageParam))
      params.set('limit', String(limit))
      const path = `/v1/events?${params.toString()}`
      if (personalizedFor != null) {
        const token = await getToken()
        // Throw instead of falling back to the anonymous fetch — with
        // staleTime, a cached anonymous page under the personalized key
        // would stick (no followedArtists) after a transient token gap.
        // Throwing lets React Query retry (same reasoning as
        // useSpotifyConnection).
        if (!token) {
          throw new Error('Auth token unavailable while fetching events')
        }
        if (tasteRequested) {
          try {
            return await apiClient.get<EventsListResponse>(path, token)
          } catch (err) {
            // Entitlement lapsed (or lost) mid-session: fall back to the
            // unfiltered list rather than erroring the whole browse view.
            // Mirrors the SSR fallback in events/page.tsx.
            if (
              err instanceof ApiError &&
              (err.status === 401 || err.status === 403)
            ) {
              console.warn(
                'taste filter rejected — falling back to unfiltered',
                err,
              )
              params.delete('taste')
              return apiClient.get<EventsListResponse>(
                `/v1/events?${params.toString()}`,
                token,
              )
            }
            throw err
          }
        }
        return apiClient.get<EventsListResponse>(path, token)
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
