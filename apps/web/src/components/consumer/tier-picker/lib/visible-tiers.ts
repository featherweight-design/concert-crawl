// Which tiers render, given the founder window + picker state (design
// handoff r5VisibleTiers). Founder disappears once the launch window
// closes — EXCEPT for a user who IS a Founder, who keeps their
// current-plan card so they can see their plan post-window-close.
// Pre-launch keeps the card visible (disabled CTA) — the launch tease.

import type { FounderWindowState } from '@concert-crawl/types'
import { TIER_DEFINITIONS, TIER_ORDER } from '../definitions/constants'
import type { PickerState, TierDefinition } from '../definitions/types'

export const visibleTiers = (
  founderWindowState: FounderWindowState,
  state: PickerState,
): TierDefinition[] => {
  const keys =
    founderWindowState === 'closed' && state !== 'founder'
      ? TIER_ORDER.filter((key) => key !== 'founder')
      : TIER_ORDER
  return keys.map((key) => TIER_DEFINITIONS[key])
}

// Default expanded row for the mobile accordion: the current plan when it
// renders, otherwise the recommended tier (Premium).
export const defaultExpandedTier = (
  tiers: TierDefinition[],
  state: PickerState,
): TierDefinition['key'] | null => {
  if (tiers.some((tier) => tier.key === state)) {
    const match = tiers.find((tier) => tier.key === state)
    return match ? match.key : null
  }
  if (tiers.some((tier) => tier.key === 'premium')) return 'premium'
  return tiers[0]?.key ?? null
}
