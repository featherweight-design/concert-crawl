import 'server-only'

import {
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'

import { publicApiClient } from '@/lib/api'

// apps/web has no zod dependency, so the boundary is narrowed with the same
// hand-written guard the client hook uses (`use-feature-flags.ts`). A partial
// or mistyped map is rejected outright so it can never turn a default-off
// flag on.
function isFeatureFlagView(value: unknown): value is FeatureFlagView {
  if (typeof value !== 'object' || value === null) return false
  const record: Record<string, unknown> = { ...value }
  return FEATURE_FLAG_KEYS.every((key) => typeof record[key] === 'boolean')
}

export const getFeatureFlags = async (): Promise<FeatureFlagView> => {
  try {
    const raw = await publicApiClient.get<unknown>('/v1/flags')
    if (!isFeatureFlagView(raw)) {
      console.error('feature flags: unexpected payload')
      return featureFlagDefaults()
    }
    return raw
  } catch (err) {
    // Fail open to the registry, which defaults the unreleased features off.
    // An unreachable API must never reveal something we have not shipped.
    console.error('feature flags: fetch failed, using defaults', err)
    return featureFlagDefaults()
  }
}

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  const flags = await getFeatureFlags()
  return flags[key]
}
