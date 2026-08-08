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
  | 'crews'

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
  'crews',
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
//   - 2026-08-05 crews decision (#1226): supporter is visible-active on the
//     same test — a crew carries no per-crew marginal cost.
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
  // Gates the act of CREATING a crew and nothing else (#1226 D6). Joining,
  // reading, leaving, and muting are un-gated on every plan, and a lapsed
  // creator keeps every crew they already made — so the apparent gap here is
  // the design, not an oversight. Do not "fix" it by gating reads.
  crews: {
    'logged-out': 'tier-picker-on-tap',
    free: 'paywall-on-tap',
    supporter: 'visible-active',
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

// The follow affordance's gate, in one place. Every surface that renders a
// Follow control asks this and nothing else.
//
// It takes PlanStateLike rather than a bare UserPlan because `roleComped` is an
// override the matrix does not encode — a comped user on plan 'free' would
// otherwise render locked. And it negates canUseFeature rather than listing
// tiers: `tier === 'free' || tier === 'supporter'` answers false for
// 'logged-out', which is locked too. Design R2 leaked a live Follow button to
// Supporter on six surfaces by testing the tier string inline; that is what
// this exists to end.
//
// Most call sites should still prefer useEntitlement('following') and read
// `surface`, which also answers whether a locked tap opens the paywall or the
// tier picker. nfLocked is for render paths that already hold a plan state and
// would otherwise re-query.
export const nfLocked = (state: PlanStateLike): boolean =>
  !canUseFeature(state, 'following')

// UX routing for the false case — what the renderer shows on locked taps.
// roleComped short-circuits to 'visible-active' so callers that skip the
// canUseFeature pre-check can never route a comped user to a locked surface.
export const lockedSurface = (
  state: PlanStateLike,
  feature: PremiumFeature,
): EntitlementCell =>
  state.roleComped ? 'visible-active' : ENTITLEMENTS_MATRIX[feature][state.plan]
