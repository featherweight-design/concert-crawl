// Feature copy shared across welcome/win-back/gift-ending so the lists can't
// drift between templates when entitlements or naming change (#783). Phrasing
// follows the design handoff PREMIUM_FEATURES / WINBACK_FEATURES, with one
// deliberate departure.
//
// ⚠️ Following leads and Spotify sync is not sold beside it (native
// following, PR 10). Sync is capped by Spotify at a handful of connected
// accounts, so pairing it onto a line reads as half the offer to a reader who
// will never get a seat. Every list here therefore names following as the
// artist benefit and leaves sync out; the tier picker keeps it as a mono
// aside, which is the one place a caveat fits.

import type { FeatureItem } from '../atoms.js'

// Full welcome list — five items, the last a forward-looking ★ marker.
export const PREMIUM_FEATURES: FeatureItem[] = [
  'Concerts: every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'Follow any artist, get their Denver dates',
  'New-show and price-drop alerts',
  { text: "More coming — you're early", future: true },
]

// Founder + gifted welcome show the four concrete unlocks without the ★ future
// row (they append their own tier-specific line instead).
export const PREMIUM_FEATURES_CORE: FeatureItem[] = PREMIUM_FEATURES.slice(0, 4)

// Win-back reuses the four concrete unlocks, no ★ (nothing aspirational in a
// "here's what you'd get back" pitch).
export const WINBACK_FEATURES: FeatureItem[] = [
  'Concerts: every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'Follow any artist, get their Denver dates',
  'New-show and price-drop alerts',
]

// Gift-ending callout uses a tighter three-line summary.
export const GIFT_KEEP_FEATURES: FeatureItem[] = [
  'Concerts: every show you attend, logged',
  'Calendar export — Apple + Google, one tap',
  'Follow any artist, plus new-show and price-drop alerts',
]
