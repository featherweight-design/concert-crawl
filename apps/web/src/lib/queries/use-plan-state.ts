'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { PlanState } from '@concert-crawl/types'
import { fetchMe } from '@/lib/users'

export const planStateQueryKey = ['plan-state'] as const

// Client-side source of truth for the current user's PlanState, derived by
// GET /v1/users/me (same derivation the server-side entitlement gate uses).
// Client gating is UX routing only — paid-feature endpoints enforce with
// requireFeature() on the API.
export function usePlanState() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery<PlanState | null>({
    queryKey: planStateQueryKey,
    queryFn: async () => {
      const token = await getToken()
      if (!token) return null
      const profile = await fetchMe(token)
      return profile.planState
    },
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}
