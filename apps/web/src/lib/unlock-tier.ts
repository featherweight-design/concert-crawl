// Which tier unlocks a premium feature — derived from the entitlements matrix
// rather than named in the UI. The locked History takeover needs a tier name, a
// price, and a perk list; hardcoding 'supporter' there would fork the
// tier→feature mapping that packages/entitlements owns outright, which is the
// exact drift class Copilot caught on #820.

import { ENTITLEMENTS_MATRIX, USER_PLANS } from '@concert-crawl/entitlements'
import type { PremiumFeature } from '@concert-crawl/entitlements'
import { TIER_DEFINITIONS } from '@/components/consumer/tier-picker/definitions/constants'
import type {
  TierDefinition,
  TierKey,
} from '@/components/consumer/tier-picker/definitions/types'

// USER_PLANS is ordered least- to most-entitled for the five real plans, so the
// cheapest 'visible-active' hit is the cheapest lane that unlocks the feature.
// Plans that aren't purchasable picker tiers are skipped rather than returned:
// 'logged-out' is not a lane at all, and 'gifted' can't be bought, so neither
// can be offered as an upgrade target.
const isTierKey = (plan: string): plan is TierKey => plan in TIER_DEFINITIONS

export const unlockTierFor = (
  feature: PremiumFeature,
): TierDefinition | null => {
  for (const plan of USER_PLANS) {
    if (plan === 'logged-out' || !isTierKey(plan)) continue
    if (ENTITLEMENTS_MATRIX[feature][plan] !== 'visible-active') continue
    return TIER_DEFINITIONS[plan]
  }
  return null
}
