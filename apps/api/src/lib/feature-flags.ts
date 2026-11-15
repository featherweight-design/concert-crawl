import { db, featureFlagUsers, featureFlags } from '@concert-crawl/db';
import {
  featureFlagDefaults,
  isFeatureFlagKey,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements';

import {
  flagAppliesTo,
  type FlagState,
  type FlagViewer,
} from './flag-ladder.js';
import { apiLogger } from './logger.js';

export const FEATURE_FLAG_CACHE_TTL_MS = 30_000;

type FlagStates = Map<FeatureFlagKey, FlagState>;

let cached: FlagStates | null = null;
let cachedAt = 0;
// Held only while a refresh is in flight. Every request arriving during the
// window shares that one query instead of each issuing its own, which is what
// stops an expiry from turning concurrent traffic into a burst of reads.
let inFlight: Promise<FlagStates> | null = null;

/** Called after an admin write so the next read reflects it in-process. */
export const clearFeatureFlagCache = (): void => {
  cached = null;
  cachedAt = 0;
  inFlight = null;
};

/**
 * Every stored flag's rung, owner and named people, memoized for 30 seconds.
 * The memo holds state, not an answer: who sees a flag depends on the viewer,
 * so the answer is worked out per request (`loadFeatureFlags`).
 */
const loadFlagStates = async (): Promise<FlagStates> => {
  if (cached && Date.now() - cachedAt < FEATURE_FLAG_CACHE_TTL_MS) {
    return cached;
  }
  if (inFlight) return inFlight;

  inFlight = refreshFlagStates();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

const refreshFlagStates = async (): Promise<FlagStates> => {
  const states: FlagStates = new Map();

  try {
    const [rows, people] = await Promise.all([
      db
        .select({
          key: featureFlags.key,
          stage: featureFlags.stage,
          ownerUserId: featureFlags.stageOwnerUserId,
        })
        .from(featureFlags),
      db
        .select({
          flagKey: featureFlagUsers.flagKey,
          userId: featureFlagUsers.userId,
        })
        .from(featureFlagUsers),
    ]);
    const named = new Map<string, Set<string>>();
    for (const person of people) {
      const set = named.get(person.flagKey) ?? new Set<string>();
      set.add(person.userId);
      named.set(person.flagKey, set);
    }
    for (const row of rows) {
      // A key that has left the registry is ignored rather than surfaced, so
      // deleting a flag from the code is safe without a data migration.
      if (!isFeatureFlagKey(row.key)) continue;
      states.set(row.key, {
        stage: row.stage,
        ownerUserId: row.ownerUserId,
        people: named.get(row.key) ?? new Set<string>(),
      });
    }
  } catch (err) {
    // An unreachable table must never widen a flag. If there is a previous
    // answer it is kept (an admin may have staged a default-on flag down to Off
    // or Me, and the registry default would undo that for everyone); only a
    // cold start with nothing cached falls back to the registry defaults, which
    // keep the unreleased features off. The failure is cached like any other
    // answer, so an outage costs one query and one log line per TTL window
    // rather than one per request. Recovery lands on the next expiry, or
    // immediately on the `clearFeatureFlagCache()` that follows an admin write.
    apiLogger.error(
      { err },
      'feature flag read failed, using last known state',
    );
    if (cached) {
      cachedAt = Date.now();
      return cached;
    }
    states.clear();
  }

  cached = states;
  cachedAt = Date.now();
  return states;
};

/**
 * The flag map as this viewer sees it. A flag with no stored row reads its
 * registry default for everyone. Logged-out visitors (`viewer` null) see only
 * the flags that are at Everyone.
 */
export const loadFeatureFlags = async (
  viewer: FlagViewer | null = null,
): Promise<FeatureFlagView> => {
  const states = await loadFlagStates();
  const flags = featureFlagDefaults();
  for (const [key, state] of states) {
    flags[key] = flagAppliesTo(state, viewer);
  }
  return flags;
};

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
  viewer: FlagViewer | null = null,
): Promise<boolean> => {
  const flags = await loadFeatureFlags(viewer);
  return flags[key];
};
