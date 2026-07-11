'use client'

import { useAuth } from '@clerk/nextjs'
import { canUseFeature, lockedSurface } from '@concert-crawl/entitlements'
import type {
  EntitlementCell,
  PlanStateLike,
  PremiumFeature,
} from '@concert-crawl/entitlements'
import { usePlanState } from './use-plan-state'

export interface EntitlementResult {
  isLoading: boolean
  // Whether the feature is usable for the current plan.
  active: boolean
  // UX routing for locked taps per the entitlements matrix ('visible-active'
  // when usable). null while plan state is still resolving — callers should
  // hold rendering (skeleton), never flash a locked treatment.
  surface: EntitlementCell | null
}

const LOGGED_OUT_STATE: PlanStateLike = {
  plan: 'logged-out',
  roleComped: false,
}

// Single client-side gate for premium features. Resolves the current plan
// (from /v1/users/me) and answers both "is this feature active?" and "what
// does a locked tap open?". Server-side enforcement lives in the API's
// requireFeature() middleware — this hook is presentation-only.
export function useEntitlement(feature: PremiumFeature): EntitlementResult {
  const { isSignedIn } = useAuth()
  const { data: planState, isPending } = usePlanState()

  // Clerk still resolving the session — treat as loading.
  if (isSignedIn === undefined) {
    return { isLoading: true, active: false, surface: null }
  }

  const state: PlanStateLike | null = isSignedIn
    ? (planState ?? null)
    : LOGGED_OUT_STATE

  if (state === null) {
    // Signed in but plan state not yet fetched (query disabled returns
    // isPending forever, so gate on isSignedIn above first).
    return { isLoading: isPending, active: false, surface: null }
  }

  return {
    isLoading: false,
    active: canUseFeature(state, feature),
    surface: lockedSurface(state, feature),
  }
}
