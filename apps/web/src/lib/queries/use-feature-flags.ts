'use client'

import {
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'
import { useQuery } from '@tanstack/react-query'

import { publicApiClient } from '@/lib/api'

export const featureFlagsQueryKey = ['feature-flags'] as const

// apps/web has no zod dependency, so the boundary is narrowed with a
// hand-written guard rather than a generic the client cannot verify (same
// approach as use-event-watchers). A partial or mistyped map is rejected
// outright so it can never turn a default-off flag on.
function isFeatureFlagView(value: unknown): value is FeatureFlagView {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return FEATURE_FLAG_KEYS.every((key) => typeof record[key] === 'boolean')
}

// Deliberately not gated on isSignedIn, unlike usePlanState: flags gate
// logged-out surfaces too, so the query must run for everyone.
export function useFeatureFlags() {
  return useQuery<FeatureFlagView>({
    queryKey: featureFlagsQueryKey,
    queryFn: async (): Promise<FeatureFlagView> => {
      const raw = await publicApiClient.get<unknown>('/v1/flags')
      if (!isFeatureFlagView(raw)) {
        throw new Error('Unexpected /v1/flags response shape')
      }
      return raw
    },
    // Matches the endpoint's own Cache-Control: public, max-age=30, so the
    // client refetch cadence and the HTTP cache expire together.
    staleTime: 30 * 1000,
  })
}

// Element-level gate. `enabled` reads the registry default until the fetch
// lands and whenever it fails, so a released feature never blinks out on load
// and an unreleased one is never briefly shown. Callers that would rather hold
// their render than show the default can read `isLoading`.
export function useFeatureFlag(key: FeatureFlagKey): {
  isLoading: boolean
  enabled: boolean
} {
  const { data, isPending } = useFeatureFlags()
  return {
    isLoading: isPending,
    enabled: (data ?? featureFlagDefaults())[key],
  }
}
