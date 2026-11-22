'use client';

import { useAuth } from '@clerk/nextjs';
import {
  canUseFeature,
  featureFlagDefaults,
  flagForEntitlement,
  lockedSurface,
} from '@concert-crawl/entitlements';
import type {
  EntitlementCell,
  PlanStateLike,
  PremiumFeature,
} from '@concert-crawl/entitlements';
import { useFeatureFlags } from './use-feature-flags';
import { usePlanState } from './use-plan-state';

export interface EntitlementResult {
  isLoading: boolean;
  // Whether the feature is usable for the current plan.
  active: boolean;
  // UX routing for locked taps per the entitlements matrix ('visible-active'
  // when usable). null while plan state is still resolving — callers should
  // hold rendering (skeleton), never flash a locked treatment.
  surface: EntitlementCell | null;
}

const LOGGED_OUT_STATE: PlanStateLike = {
  plan: 'logged-out',
  roleComped: false,
};

// What a signed-in account is entitled to when its own plan state could not
// be read. Every account is on the free plan now, and the free plan passes
// every gate.
const SIGNED_IN_FALLBACK_STATE: PlanStateLike = {
  plan: 'free',
  roleComped: false,
};

// Single client-side gate for premium features. Resolves the current plan
// (from /v1/users/me) and answers both "is this feature active?" and "what
// does a locked tap open?". Server-side enforcement lives in the API's
// requireFeature() middleware — this hook is presentation-only.
export function useEntitlement(feature: PremiumFeature): EntitlementResult {
  const { isSignedIn } = useAuth();
  const { data: planState, isPending } = usePlanState();
  const flagKey = flagForEntitlement(feature);
  const { data: flags, isPending: flagsPending } = useFeatureFlags();

  // A release flag can only restrict, never grant, so this short-circuits the
  // false case and leaves every true case to the matrix below. Hold rendering
  // while the map loads rather than flashing the unflagged treatment. When the
  // fetch fails outright `flags` is undefined and the registry defaults stand
  // in, which keeps a released feature visible through a transient network
  // failure while keeping an unreleased one hidden — the case that must never
  // leak. Placed before the isSignedIn guard so logged-out surfaces are gated
  // too; both queries are called first so the hook order stays unconditional.
  if (flagKey !== null) {
    if (flagsPending) return { isLoading: true, active: false, surface: null };
    if (!(flags ?? featureFlagDefaults())[flagKey]) {
      return { isLoading: false, active: false, surface: 'hidden' };
    }
  }

  // Clerk still resolving the session — treat as loading.
  if (isSignedIn === undefined) {
    return { isLoading: true, active: false, surface: null };
  }

  const state: PlanStateLike | null = isSignedIn
    ? (planState ?? null)
    : LOGGED_OUT_STATE;

  if (state === null) {
    if (isPending) {
      // Signed in but plan state not yet fetched (query disabled returns
      // isPending forever, so gate on isSignedIn above first).
      return { isLoading: true, active: false, surface: null };
    }
    // Signed in but the fetch settled without a PlanState (token race or
    // fetch error). The app is free, so a signed-in account is answered as
    // the free plan, which passes every live gate. Never fall back to the
    // logged-out surface here: that put paywalls and sign-in prompts in front
    // of signed-in fans whenever /v1/users/me failed. The API still enforces.
    return {
      isLoading: false,
      active: canUseFeature(SIGNED_IN_FALLBACK_STATE, feature),
      surface: lockedSurface(SIGNED_IN_FALLBACK_STATE, feature),
    };
  }

  return {
    isLoading: false,
    active: canUseFeature(state, feature),
    surface: lockedSurface(state, feature),
  };
}
