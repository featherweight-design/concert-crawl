import type { PremiumFeature } from './index.js'

// Its own namespace, deliberately not an alias of PremiumFeature: a flag must
// be able to name a feature with no entitlement (release-notes) and a feature
// that does not exist yet.
export type FeatureFlagKey = 'spotify-sync' | 'crews' | 'release-notes'

export interface FeatureFlagDefinition {
  key: FeatureFlagKey
  /** Admin UI row title. */
  label: string
  /** Admin UI: what disappears for customers when this is off. */
  description: string
  /** The entitlement this flag restricts, where one exists. */
  entitlement: PremiumFeature | null
  /** Value used when the table has no row for this key. */
  defaultEnabled: boolean
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  'spotify-sync': {
    key: 'spotify-sync',
    label: 'Spotify sync',
    description:
      'Connecting Spotify, taste picks, and the weekly digest email.',
    entitlement: 'spotify-sync',
    defaultEnabled: false,
  },
  crews: {
    key: 'crews',
    label: 'Crews',
    description:
      'The Crews tab, crew pages, invites, and the Browse crew lens.',
    entitlement: 'crews',
    defaultEnabled: false,
  },
  'release-notes': {
    key: 'release-notes',
    label: 'Release notes',
    description:
      'The changelog page, the version footer, and the feature-drop pill.',
    entitlement: null,
    defaultEnabled: true,
  },
}

export const FEATURE_FLAG_KEYS: readonly FeatureFlagKey[] = [
  'spotify-sync',
  'crews',
  'release-notes',
]

export const isFeatureFlagKey = (value: string): value is FeatureFlagKey =>
  Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value)

/** The map every reader starts from before merging stored rows over it. */
export const featureFlagDefaults = (): Record<FeatureFlagKey, boolean> => ({
  'spotify-sync': FEATURE_FLAGS['spotify-sync'].defaultEnabled,
  crews: FEATURE_FLAGS.crews.defaultEnabled,
  'release-notes': FEATURE_FLAGS['release-notes'].defaultEnabled,
})

// Well-defined only because the registry test forbids two flags naming the
// same entitlement. useEntitlement depends on that invariant.
export const flagForEntitlement = (
  feature: PremiumFeature,
): FeatureFlagKey | null => {
  for (const key of FEATURE_FLAG_KEYS) {
    if (FEATURE_FLAGS[key].entitlement === feature) return key
  }
  return null
}

/** What the public endpoint returns. Labels and descriptions are withheld. */
export type FeatureFlagView = Record<FeatureFlagKey, boolean>

/** What the admin endpoint returns: the registry prose plus current state. */
export interface AdminFeatureFlag {
  key: FeatureFlagKey
  label: string
  description: string
  enabled: boolean
  updatedAt: string | null
  updatedBy: string | null
}
