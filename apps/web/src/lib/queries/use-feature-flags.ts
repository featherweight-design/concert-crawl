'use client';

import {
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import { apiClient, publicApiClient } from '@/lib/api';

export const featureFlagsQueryKey = ['feature-flags'] as const;

// apps/web has no zod dependency, so the boundary is narrowed with a
// hand-written guard rather than a generic the client cannot verify (same
// approach as use-event-watchers). A partial or mistyped map is rejected
// outright so it can never turn a default-off flag on.
function isFeatureFlagView(value: unknown): value is FeatureFlagView {
  if (typeof value !== 'object' || value === null) return false;
  const record: Record<string, unknown> = { ...value };
  return FEATURE_FLAG_KEYS.every((key) => typeof record[key] === 'boolean');
}

// Deliberately not gated on isSignedIn, unlike usePlanState: flags gate
// logged-out surfaces too, so the query must run for everyone. It waits for
// Clerk to settle, though: a flag at Me or Beta is on for some people only, so
// the map is the viewer's own (their token goes with the request) and it is
// cached per viewer, never shared between a signed-out and a signed-in answer.
export function useFeatureFlags() {
  const { isLoaded, userId, getToken } = useAuth();
  return useQuery<FeatureFlagView>({
    queryKey: [...featureFlagsQueryKey, userId ?? 'signed-out'],
    enabled: isLoaded,
    queryFn: async (): Promise<FeatureFlagView> => {
      const token = userId ? await getToken() : null;
      const raw =
        token === null
          ? await publicApiClient.get<unknown>('/v1/flags')
          : await apiClient.get<unknown>('/v1/flags', token);
      if (!isFeatureFlagView(raw)) {
        throw new Error('Unexpected /v1/flags response shape');
      }
      return raw;
    },
    // Matches the endpoint's own Cache-Control (max-age=30), so the client
    // refetch cadence and the HTTP cache expire together.
    staleTime: 30 * 1000,
  });
}

// Element-level gate. `enabled` reads the registry default until the first
// fetch lands, so a released feature never blinks out on load and an unreleased
// one is never briefly shown. A later refetch that fails keeps the last
// successful map rather than falling back to defaults. Callers that would
// rather hold their render than show the default can read `isLoading`.
export function useFeatureFlag(key: FeatureFlagKey): {
  isLoading: boolean;
  /** True only once a fetch has returned data (false after a failed one). */
  loaded: boolean;
  enabled: boolean;
} {
  const { data, isPending } = useFeatureFlags();
  return {
    isLoading: isPending,
    loaded: data !== undefined,
    enabled: (data ?? featureFlagDefaults())[key],
  };
}
