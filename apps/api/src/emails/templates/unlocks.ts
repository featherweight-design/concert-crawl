// Feature copy shared across welcome/win-back/gift-ending so the lists can't
// drift between templates when entitlements or naming change (#783). Phrasing
// is verbatim from the design handoff PREMIUM_FEATURES / WINBACK_FEATURES.

import type { FeatureItem } from '../atoms.js'

// Full welcome list — five items, the last a forward-looking ★ marker.
export const PREMIUM_FEATURES: FeatureItem[] = [
  'Concert history — every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'Follow artists + new-show alerts',
  'Price-drop alerts + Spotify sync',
  { text: "More coming — you're early", future: true },
]

// Founder + gifted welcome show the four concrete unlocks without the ★ future
// row (they append their own tier-specific line instead).
export const PREMIUM_FEATURES_CORE: FeatureItem[] = PREMIUM_FEATURES.slice(0, 4)

// Win-back reuses the four concrete unlocks, no ★ (nothing aspirational in a
// "here's what you'd get back" pitch).
export const WINBACK_FEATURES: FeatureItem[] = [
  'Concert history — every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'Follow artists + new-show alerts',
  'Price-drop alerts + Spotify sync',
]

// Gift-ending callout uses a tighter three-line summary.
export const GIFT_KEEP_FEATURES: FeatureItem[] = [
  'Concert history — every show you attend, logged',
  'Calendar export + Spotify sync',
  'Follow artists + price-drop alerts',
]
