import type { PremiumFeature } from './index.js';

// Its own namespace, deliberately not an alias of PremiumFeature: a flag must
// be able to name a feature with no entitlement (release-notes) and a feature
// that does not exist yet.
export type FeatureFlagKey = 'spotify-sync' | 'crews' | 'release-notes';

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  /** Admin UI row title. */
  label: string;
  /** Admin UI: what disappears for customers when this is off. */
  description: string;
  /** The entitlement this flag restricts, where one exists. */
  entitlement: PremiumFeature | null;
  /** Value used when the table has no row for this key. */
  defaultEnabled: boolean;
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
};

// Takes `unknown` so it can guard values arriving from real boundaries — DB
// rows, request bodies, env vars — without a cast at each call site.
export const isFeatureFlagKey = (value: unknown): value is FeatureFlagKey =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, value);

export const FEATURE_FLAG_KEYS: readonly FeatureFlagKey[] =
  Object.keys(FEATURE_FLAGS).filter(isFeatureFlagKey);

/** The map every reader starts from before merging stored rows over it. */
export const featureFlagDefaults = (): Record<FeatureFlagKey, boolean> => ({
  'spotify-sync': FEATURE_FLAGS['spotify-sync'].defaultEnabled,
  crews: FEATURE_FLAGS.crews.defaultEnabled,
  'release-notes': FEATURE_FLAGS['release-notes'].defaultEnabled,
});

// Well-defined only because the registry test forbids two flags naming the
// same entitlement. useEntitlement depends on that invariant.
export const flagForEntitlement = (
  feature: PremiumFeature,
): FeatureFlagKey | null => {
  for (const key of FEATURE_FLAG_KEYS) {
    if (FEATURE_FLAGS[key].entitlement === feature) return key;
  }
  return null;
};

/** What the public endpoint returns. Labels and descriptions are withheld. */
export type FeatureFlagView = Record<FeatureFlagKey, boolean>;

/** What the admin endpoint returns: the registry prose plus current state. */
export interface AdminFeatureFlag {
  key: FeatureFlagKey;
  label: string;
  description: string;
  /** The old boolean: on only at Everyone. Kept until the contract step. */
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  // The ladder (admin redesign Phase 5c). Optional so the first admin page that
  // reads only `enabled` keeps compiling; the API always sends them.
  stage?: 'off' | 'me' | 'beta' | 'everyone';
  stageOwnerUserId?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedNote?: string | null;
  /** The named people, as Clerk user ids. */
  people?: string[];
  /** Which environment this admin is, from the API's own marker. */
  environment?: 'staging' | 'production';
  /** Production keeps the flag locked until it is verified there. */
  locked?: boolean;
}
