import { db, featureFlags } from '@concert-crawl/db'
import {
  featureFlagDefaults,
  isFeatureFlagKey,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements'

import { apiLogger } from './logger.js'

export const FEATURE_FLAG_CACHE_TTL_MS = 30_000

let cached: FeatureFlagView | null = null
let cachedAt = 0
// Held only while a refresh is in flight. Every request arriving during the
// window shares that one query instead of each issuing its own, which is what
// stops an expiry from turning concurrent traffic into a burst of reads.
let inFlight: Promise<FeatureFlagView> | null = null

/** Called after an admin write so the next read reflects it in-process. */
export const clearFeatureFlagCache = (): void => {
  cached = null
  cachedAt = 0
  inFlight = null
}

export const loadFeatureFlags = async (): Promise<FeatureFlagView> => {
  if (cached && Date.now() - cachedAt < FEATURE_FLAG_CACHE_TTL_MS) {
    return cached
  }
  if (inFlight) return inFlight

  inFlight = refreshFeatureFlags()
  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

const refreshFeatureFlags = async (): Promise<FeatureFlagView> => {
  const flags = featureFlagDefaults()

  try {
    const rows = await db
      .select({ key: featureFlags.key, enabled: featureFlags.enabled })
      .from(featureFlags)
    for (const row of rows) {
      // A key that has left the registry is ignored rather than surfaced, so
      // deleting a flag from the code is safe without a data migration.
      if (isFeatureFlagKey(row.key)) flags[row.key] = row.enabled
    }
  } catch (err) {
    // Fail closed for the flags that default off, which is the safe direction:
    // an unreachable table must never reveal an unreleased feature. `flags` is
    // already the defaults, and the failure is cached like any other answer, so
    // an outage costs one query and one log line per TTL window rather than one
    // per request. Recovery lands on the next expiry, or immediately on the
    // `clearFeatureFlagCache()` that follows an admin write.
    apiLogger.error({ err }, 'feature flag read failed, using defaults')
  }

  cached = flags
  cachedAt = Date.now()
  return flags
}

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  const flags = await loadFeatureFlags()
  return flags[key]
}
