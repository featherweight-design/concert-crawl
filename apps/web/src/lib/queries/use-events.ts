'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { EventsListResponse } from '@concert-crawl/types';
import { STALE_30_MIN } from '@/lib/query-client';
import { apiClient, publicApiClient } from '@/lib/api';
import { isScopeRejection, scopeRetryToken } from '@/lib/scope-rejection';
import { buildEventsApiParams } from '@/lib/events-api-params';

// personalizedFor is the viewer's userId when the request is scoped to their
// follows, null for the shared anonymous shape. Scoping the personalized entry
// by userId matters because the app-level QueryClient outlives sign-in
// sessions — an account switch must not briefly serve the previous user's
// scoped list (same reasoning as planStateQueryKey).
export function eventsQueryKey(
  paramsString: string,
  personalizedFor: string | null,
) {
  return ['events', paramsString, personalizedFor] as const;
}

interface UseEventsOptions {
  searchParamsString: string; // URLSearchParams serialized (without offset)
  limit: number;
  initialData?: EventsListResponse;
  initialOffset?: number;
}

export function useEvents({
  searchParamsString,
  limit,
  initialData,
  initialOffset = 0,
}: UseEventsOptions) {
  const { getToken, userId } = useAuth();
  // The retired taste filter's `filterTaste` page param is ignored: a stored
  // ?filterTaste=1 link loads the plain list.
  const pageParams = new URLSearchParams(searchParamsString);
  // "My artists" (native following) needs a signed-in viewer, so a
  // filterFollowing URL without a userId is a stale link: drop the flag. It
  // was the scope Load More lost: the page URL carries `filterFollowing`, the
  // API takes `following`, and nothing translated between them on this path,
  // so page 2 returned the unscoped list under a banner still claiming it.
  const followingRequested =
    pageParams.get('filterFollowing') === '1' && userId != null;
  const scopeRequested = followingRequested;
  const personalizedFor = scopeRequested && userId != null ? userId : null;
  return useInfiniteQuery({
    // personalizedFor is part of the key so anonymous pages aren't reused for
    // the scoped view, and scoped pages are never shared across viewers.
    queryKey: eventsQueryKey(searchParamsString, personalizedFor),
    // Fetch anonymously unless a follow scope is requested: an anonymous
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
      const pathFor = (following: boolean): string =>
        `/v1/events?${buildEventsApiParams(pageParams, {
          limit,
          offset: pageParam,
          following,
        }).toString()}`;

      const path = pathFor(followingRequested);
      if (personalizedFor != null) {
        const token = await getToken();
        // Throw instead of falling back to the anonymous fetch — with
        // staleTime, a cached anonymous page under the personalized key
        // would stick (unscoped) after a transient token gap. Throwing lets
        // React Query retry.
        if (!token) {
          throw new Error('Auth token unavailable while fetching events');
        }
        if (scopeRequested) {
          try {
            return await apiClient.get<EventsListResponse>(path, token);
          } catch (err) {
            // Entitlement lapsed (or lost) mid-session, or the flag went off:
            // fall back to the unfiltered list rather than erroring the whole
            // browse view. One retry drops the scope, and a refused token is
            // dropped with it — the same contract the SSR path uses, from
            // the same helpers.
            if (isScopeRejection(err)) {
              console.warn(
                'scope filter rejected — falling back to unfiltered',
                err,
              );
              const retryToken = scopeRetryToken(err, token);
              const unscoped = pathFor(false);
              return retryToken
                ? apiClient.get<EventsListResponse>(unscoped, retryToken)
                : publicApiClient.get<EventsListResponse>(unscoped);
            }
            throw err;
          }
        }
        return apiClient.get<EventsListResponse>(path, token);
      }
      return publicApiClient.get<EventsListResponse>(path);
    },
    initialPageParam: initialOffset,
    getNextPageParam: (lastPage: EventsListResponse) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
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
  });
}
