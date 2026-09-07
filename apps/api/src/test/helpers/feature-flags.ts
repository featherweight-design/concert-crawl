import { featureFlags } from '@concert-crawl/db'
import type { FeatureFlagKey } from '@concert-crawl/entitlements'

import { clearFeatureFlagCache } from '../../lib/feature-flags.js'
import { testDb } from './db.js'

/**
 * Sets a release flag for a suite whose routes are gated behind it.
 *
 * Call it after `clearTables()`, which truncates the table and drops the
 * loader's cache. Both the stored row and the in-process cache have to be set
 * for the gate to see the new value.
 */
export const setFeatureFlag = async (
  key: FeatureFlagKey,
  enabled: boolean,
): Promise<void> => {
  const now = new Date()
  await testDb
    .insert(featureFlags)
    .values({ key, enabled, updatedBy: 'test', updatedAt: now })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt: now, updatedBy: 'test' },
    })
  clearFeatureFlagCache()
}
