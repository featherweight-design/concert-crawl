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
    pricePromise: TIER_PICKER_COPY.card.pricePromise,
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
    pricePromise: TIER_PICKER_COPY.card.pricePromise,
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
    // Founder's price promise is its own stronger feature bullet — no
    // duplicate microcopy line (eng judgment allowed by #782 spec).
  },
}
