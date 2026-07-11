// Tier data — prices and names are data (locked in design brief #781),
// customer-facing prose comes from copy.ts.

import { TIER_PICKER_COPY } from './copy'
import type { TierDefinition, TierKey } from './types'

const TIERS_COPY = TIER_PICKER_COPY.tiers

export const TIER_ORDER: readonly TierKey[] = [
  'free',
  'supporter',
  'premium',
  'founder',
]

export const TIER_DEFINITIONS: Record<TierKey, TierDefinition> = {
  free: {
    key: 'free',
    name: 'Free',
    priceText: '$0',
    priceUnit: 'forever',
    tagline: TIERS_COPY.free.tagline,
    rationale: TIERS_COPY.free.rationale,
    features: TIERS_COPY.free.features.map((text) => ({ text })),
  },
  supporter: {
    key: 'supporter',
    name: 'Supporter',
    priceText: '$2',
    priceUnit: '/ month',
    tagline: TIERS_COPY.supporter.tagline,
    rationale: TIERS_COPY.supporter.rationale,
    features: TIERS_COPY.supporter.features.map((text) => ({ text })),
    badgeOnlyNote: TIERS_COPY.supporter.badgeOnlyNote,
    pricePromise: TIER_PICKER_COPY.card.pricePromise.supporter,
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    priceText: '$5',
    priceUnit: '/ month',
    tagline: TIERS_COPY.premium.tagline,
    rationale: TIERS_COPY.premium.rationale,
    features: [
      ...TIERS_COPY.premium.features.map((text) => ({ text })),
      { text: TIERS_COPY.premium.futureFeature, future: true },
    ],
    pricePromise: TIER_PICKER_COPY.card.pricePromise.premium,
  },
  founder: {
    key: 'founder',
    name: 'Founder',
    priceText: '$3',
    priceUnit: '/ mo · locked forever',
    tagline: TIERS_COPY.founder.tagline,
    rationale: TIERS_COPY.founder.rationale,
    features: [
      ...TIERS_COPY.founder.features.map((text) => ({ text })),
      { text: TIERS_COPY.founder.futureFeature, future: true },
    ],
    // Founder keeps its stronger locked-$3 stamp; this line reinforces
    // rather than duplicates (#782 handoff, locked wording).
    pricePromise: TIER_PICKER_COPY.card.pricePromise.founder,
  },
}

// URL affordance for auto-opening the tier picker on the Settings · Plan
// surface (`/me?plan=open`) — used by the lifecycle takeover / day-13
// banner routing (PR 4.2) and stripped after firing.
export const PLAN_OPEN_PARAM = 'plan'
export const PLAN_OPEN_VALUE = 'open'
export const PLAN_SETTINGS_ROUTE = `/me?${PLAN_OPEN_PARAM}=${PLAN_OPEN_VALUE}`

// Matches the Tailwind sm: breakpoint (640px) that splits the /me mobile
// and desktop settings trees.
export const MOBILE_VIEWPORT_QUERY = '(max-width: 639px)'

// Full-bleed takeover surfaces sit above all app chrome: app bar/bottom
// nav z-40, feature-drop pill z-80, ModalShell scrim/dialog 90/100.
export const FULL_BLEED_TAKEOVER_Z_INDEX = 110

// Founder seat count fallback when the founder-window payload is
// unavailable at claim time (eng infra spec Part 2 §1.4 default).
export const FOUNDER_SEATS_TOTAL_FALLBACK = 100
