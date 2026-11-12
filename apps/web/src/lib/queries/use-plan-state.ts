'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { PlanState } from '@concert-crawl/types';
import { fetchMeShared } from './use-me';

// Scoped by userId: the app-level QueryClient outlives sign-in sessions, so
// an unscoped key could briefly serve the previous account's PlanState after
// an account switch.
export const planStateQueryKey = (userId: string | null | undefined) =>
  ['plan-state', userId ?? null] as const;

// Client-side source of truth for the current user's PlanState, derived by
// GET /v1/users/me (same derivation the server-side entitlement gate uses).
// Client gating is UX routing only — paid-feature endpoints enforce with
// requireFeature() on the API.
export function usePlanState() {
  const { getToken, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<PlanState>({
    queryKey: planStateQueryKey(userId),
    queryFn: async () => {
      // The shared read throws on a missing token rather than resolving null:
      // a successful null would be cached as fresh for staleTime and pin
      // entitlements locked for minutes after a transient token gap. An error
      // lets React Query retry.
      const profile = await fetchMeShared(queryClient, userId, getToken);
      return profile.planState;
    },
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  });
}
