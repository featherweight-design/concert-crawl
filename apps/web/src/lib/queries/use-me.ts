'use client';

// One read of GET /v1/users/me per page load.
//
// Four mount-time readers want a slice of the same profile: the analytics
// handle (PostHogProvider), the plan state (usePlanState), and the avatar in
// both the user menu and the bottom nav. Each used to call the endpoint on its
// own, and the handler asks Clerk's Backend API for the user on every request
// (about 160 ms each, worse when they pile up), so a page paid for the same
// answer three or four times. They keep their own query keys and their own
// shapes; only the fetch is shared.
//
// `fetchQuery` is what makes it one request: it serves a fresh cached profile,
// and joins an identical request that is already in flight instead of starting
// another.

import type { QueryClient } from '@tanstack/react-query';
import type { UserProfileResponse } from '@concert-crawl/types';
import { fetchMe } from '@/lib/users';

// Scoped by userId for the same reason as planStateQueryKey: the app-level
// QueryClient outlives sign-in sessions.
export const meQueryKey = (userId: string | null | undefined) =>
  ['me', userId ?? null] as const;

const ME_STALE_MS = 5 * 60 * 1000;

export const fetchMeShared = (
  queryClient: QueryClient,
  userId: string | null | undefined,
  getToken: () => Promise<string | null>,
): Promise<UserProfileResponse> =>
  queryClient.fetchQuery({
    queryKey: meQueryKey(userId),
    queryFn: async () => {
      const token = await getToken();
      // Throw rather than resolve null, so a transient token gap is retried
      // by the caller instead of cached as the profile.
      if (!token) throw new Error('Auth token unavailable while fetching me');
      return fetchMe(token);
    },
    staleTime: ME_STALE_MS,
  });
