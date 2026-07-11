import type { PlanState, UserPlan } from '@concert-crawl/types'

export type PremiumFeature =
  | 'watching'
  | 'concert-history'
  | 'calendar-export'
  | 'following'
  | 'alerts'
  | 'spotify-sync'
  | 'price-drop-alerts'

export type EntitlementCell =
  'visible-active' | 'paywall-on-tap' | 'tier-picker-on-tap' | 'hidden'

export const PREMIUM_FEATURES: readonly PremiumFeature[] = [
  'watching',
  'concert-history',
  'calendar-export',
  'following',
  'alerts',
  'spotify-sync',
  'price-drop-alerts',
]

export const USER_PLANS: readonly UserPlan[] = [
  'logged-out',
  'free',
  'supporter',
  'premium',
  'founder',
  'gifted',
]

// Canonical encoding of #781 §6 (with the R6 Watching-is-Free amendment).
// Single point of truth for both the boolean entitlement and the locked-tap
// UX routing — edits here must update the test table in lockstep.
export const ENTITLEMENTS_MATRIX: Record<
  PremiumFeature,
  Record<UserPlan, EntitlementCell>
> = {
  watching: {
    'logged-out': 'tier-picker-on-tap',
    free: 'visible-active',
    supporter: 'visible-active',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  'concert-history': {
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'paywall-on-tap',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  'calendar-export': {
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'paywall-on-tap',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  following: {
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'paywall-on-tap',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  alerts: {
    'logged-out': 'hidden',
    free: 'hidden',
    supporter: 'hidden',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  'spotify-sync': {
    'logged-out': 'hidden',
    free: 'hidden',
    supporter: 'hidden',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  'price-drop-alerts': {
    'logged-out': 'hidden',
    free: 'hidden',
    supporter: 'hidden',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
}

// Callers with only the serialized session payload can gate without the
// full PlanState.
export type PlanStateLike = Pick<PlanState, 'plan' | 'roleComped'>

// Boolean entitlement — the only function servers use to gate writes.
export const canUseFeature = (
  state: PlanStateLike,
  feature: PremiumFeature,
): boolean =>
  state.roleComped ||
  ENTITLEMENTS_MATRIX[feature][state.plan] === 'visible-active'

// UX routing for the false case — what the renderer shows on locked taps.
// roleComped never reaches a locked surface (canUseFeature is true first).
export const lockedSurface = (
  state: PlanStateLike,
  feature: PremiumFeature,
): EntitlementCell => ENTITLEMENTS_MATRIX[feature][state.plan]
