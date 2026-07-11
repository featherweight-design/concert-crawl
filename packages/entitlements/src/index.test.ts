import { describe, it, expect } from 'vitest'
import type { UserPlan } from '@concert-crawl/types'
import {
  ENTITLEMENTS_MATRIX,
  PREMIUM_FEATURES,
  USER_PLANS,
  canUseFeature,
  lockedSurface,
  type EntitlementCell,
  type PremiumFeature,
} from './index.js'

// Independent literal copy of #781 §6 (including the R6 Watching-is-Free
// amendment). A matrix edit fails these tests until this table is updated
// in lockstep — that friction is intentional (eng infra spec Part 1).
const EXPECTED_CELLS: Record<
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

const allCombos: Array<[PremiumFeature, UserPlan]> = PREMIUM_FEATURES.flatMap(
  (feature) =>
    USER_PLANS.map((plan): [PremiumFeature, UserPlan] => [feature, plan]),
)

describe('ENTITLEMENTS_MATRIX', () => {
  it.each(allCombos)(
    'matrix cell for %s × %s matches #781 §6',
    (feature, plan) => {
      expect(ENTITLEMENTS_MATRIX[feature][plan]).toBe(
        EXPECTED_CELLS[feature][plan],
      )
    },
  )

  it('covers exactly 7 features × 6 plans', () => {
    expect(PREMIUM_FEATURES).toHaveLength(7)
    expect(USER_PLANS).toHaveLength(6)
    expect(Object.keys(ENTITLEMENTS_MATRIX)).toHaveLength(7)
    for (const feature of PREMIUM_FEATURES) {
      expect(Object.keys(ENTITLEMENTS_MATRIX[feature])).toHaveLength(6)
    }
  })
})

describe('canUseFeature', () => {
  it.each(allCombos)(
    'returns true for %s × %s only when the cell is visible-active',
    (feature, plan) => {
      const expected = EXPECTED_CELLS[feature][plan] === 'visible-active'
      expect(canUseFeature({ plan, roleComped: false }, feature)).toBe(expected)
    },
  )

  it.each(allCombos)(
    'roleComped grants %s regardless of plan %s',
    (feature, plan) => {
      expect(canUseFeature({ plan, roleComped: true }, feature)).toBe(true)
    },
  )

  it('trial maps to plan premium, so premium features are visible-active', () => {
    const trialState: { plan: UserPlan; roleComped: boolean } = {
      plan: 'premium',
      roleComped: false,
    }
    for (const feature of PREMIUM_FEATURES) {
      expect(canUseFeature(trialState, feature)).toBe(true)
    }
  })
})

describe('lockedSurface', () => {
  it.each(allCombos)('returns the matrix cell for %s × %s', (feature, plan) => {
    expect(lockedSurface({ plan, roleComped: false }, feature)).toBe(
      EXPECTED_CELLS[feature][plan],
    )
  })
})
