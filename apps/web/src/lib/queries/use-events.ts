'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { EventsListResponse } from '@concert-crawl/types'
import { STALE_30_MIN } from '@/lib/query-client'
import { apiClient, publicApiClient } from '@/lib/api'
import { isScopeRejection, scopeRetryToken } from '@/lib/scope-rejection'
import { buildEventsApiParams } from '@/lib/events-api-params'
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
  // follow rows server-side, so they count as having taste; a `revoked` one is
  // treated as no taste because the user cannot refresh it. artistCount is the
  // count of Spotify-sourced rows persisted at the last sync — a connection
  // with zero of them gets no followedArtists from the API, so it keeps the
  // cacheable anonymous fetch.
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
  const pageParams = new URLSearchParams(searchParamsString)
  const tasteRequested = pageParams.get('filterTaste') === '1' && userId != null
  // "My artists" (native following) is gated exactly like taste, and was the
  // scope Load More lost: the page URL carries `filterFollowing`, the API
  // takes `following`, and nothing translated between them on this path — so
  // page 2 returned the unscoped list under a banner still claiming the scope.
  const followingRequested =
    pageParams.get('filterFollowing') === '1' && userId != null
  const scopeRequested = tasteRequested || followingRequested
  const personalizedFor =
    (hasTaste || scopeRequested) && userId != null ? userId : null
  return useInfiniteQuery({
    // personalizedFor is part of the key so pages fetched anonymously before
    // the connection query resolves aren't reused for the personalized view,
    // and personalized pages are never shared across viewers.
    queryKey: eventsQueryKey(searchParamsString, personalizedFor),
    // Fetch anonymously when the viewer has no Spotify taste: an anonymous
    // request returns identical data AND stays cacheable by the service
    // worker, which keeps offline browsing working for the (default,
    // protected) signed-in case. GET /v1/events is unconditionally public
    // since #794, so there is no 401 to fall back from.
    queryFn: async ({ pageParam }) => {
      // The page URL is not the API's query string: `filterWhere` is
      // `venueSlug`, `filterWhen` is a from/to window, and the scope chips are
      // presence flags. One shared builder does the translation for this fetch
      // and for the server component that rendered page 1, so Load More can
      // never widen the list it is appending to (lib/events-api-params).
      const pathFor = (taste: boolean, following: boolean): string =>
        `/v1/events?${buildEventsApiParams(pageParams, {
          limit,
          offset: pageParam,
          taste,
          following,
        }).toString()}`

      const path = pathFor(tasteRequested, followingRequested)
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
        if (scopeRequested) {
          try {
            return await apiClient.get<EventsListResponse>(path, token)
          } catch (err) {
            // Entitlement lapsed (or lost) mid-session, or the flag went off:
            // fall back to the unfiltered list rather than erroring the whole
            // browse view. One retry drops BOTH scopes, and a refused token is
            // dropped with them — the same contract the SSR path uses, from
            // the same helpers.
            if (isScopeRejection(err)) {
              console.warn(
                'scope filter rejected — falling back to unfiltered',
                err,
              )
              const retryToken = scopeRetryToken(err, token)
              const unscoped = pathFor(false, false)
              return retryToken
                ? apiClient.get<EventsListResponse>(unscoped, retryToken)
                : publicApiClient.get<EventsListResponse>(unscoped)
            }
            throw err
          }
        }
        return apiClient.get<EventsListResponse>(path, token)
      }
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
