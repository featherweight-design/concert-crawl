'use client';

// The Add-a-show list (GET /v1/history/past-shows): past nights back to the start
// of our records, paged by a keyset cursor. The caller debounces `term`; the
// query stays off until the sheet is open.

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { PastShowsResponse, PastShowsScope } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { isEntitlementError } from '@/lib/history';

// Scoped by userId for the same reason as `historyQueryKey`: the app-level
// QueryClient outlives sign-in sessions.
export const pastShowsKeyPrefix = (userId: string | null | undefined) =>
  ['past-shows', userId ?? null] as const;

export const pastShowsQueryKey = (
  userId: string | null | undefined,
  scope: PastShowsScope,
  term: string,
) => [...pastShowsKeyPrefix(userId), scope, term] as const;

interface UsePastShowsOptions {
  scope: PastShowsScope;
  /** The search text, trimmed; empty lists everything in scope. */
  term: string;
  enabled: boolean;
}

export function usePastShows({ scope, term, enabled }: UsePastShowsOptions) {
  const { getToken, isSignedIn, userId } = useAuth();

  return useInfiniteQuery({
    queryKey: pastShowsQueryKey(userId, scope, term),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<PastShowsResponse> => {
      const token = await getToken();
      if (!token) throw new Error('Auth token unavailable for past shows');
      const params = new URLSearchParams({ scope });
      if (term !== '') params.set('q', term);
      if (pageParam !== null) params.set('cursor', pageParam);
      return apiClient.get<PastShowsResponse>(
        `/v1/history/past-shows?${params.toString()}`,
        token,
      );
    },
    getNextPageParam: (page) => page.nextCursor,
    // Typing or switching scope keeps the last list on screen until the new one
    // lands, instead of flashing six skeleton rows on every debounce tick.
    placeholderData: keepPreviousData,
    enabled: enabled && !!isSignedIn && !!userId,
    // A 403 is the plan's verdict (the follows scope without the entitlement),
    // not a transient failure.
    retry: (failureCount, error) =>
      !isEntitlementError(error) && failureCount < 3,
  });
}
