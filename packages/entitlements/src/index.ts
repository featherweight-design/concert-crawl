import type { PlanState, UserPlan } from '@concert-crawl/types'

export {
  derivePlanState,
  isGiftLive,
  LIVE_STATUSES,
  type PlanDerivationInput,
} from './plan-state.js'

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

// Canonical encoding of #781 §6, as amended by:
//   - R6 Watching-is-Free (watching is visible-active for every signed-in tier)
//   - #763 §7 (E8) spotify-sync: free/supporter are paywall-on-tap and
//     logged-out is tier-picker-on-tap, superseding #781's hidden cells
//   - 2026-07-29 Supporter-unlocks amendment: concert-history and
//     calendar-export are visible-active for supporter, restoring the
//     active-vs-passive split from the beta-to-launch spec. Both features run
//     on existing infrastructure; Premium keeps the four features with real
//     ongoing cost (following, alerts, price-drop-alerts, spotify-sync).
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
    supporter: 'visible-active',
    premium: 'visible-active',
    founder: 'visible-active',
    gifted: 'visible-active',
  },
  'calendar-export': {
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'visible-active',
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
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'paywall-on-tap',
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
// roleComped short-circuits to 'visible-active' so callers that skip the
// canUseFeature pre-check can never route a comped user to a locked surface.
export const lockedSurface = (
  state: PlanStateLike,
  feature: PremiumFeature,
): EntitlementCell =>
  state.roleComped ? 'visible-active' : ENTITLEMENTS_MATRIX[feature][state.plan]
