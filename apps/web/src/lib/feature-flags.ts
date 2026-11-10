import 'server-only';

import {
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements';

import { connection } from 'next/server';

import { publicApiClient } from '@/lib/api';

// apps/web has no zod dependency, so the boundary is narrowed with the same
// hand-written guard the client hook uses (`use-feature-flags.ts`). A partial
// or mistyped map is rejected outright so it can never turn a default-off
// flag on.
function isFeatureFlagView(value: unknown): value is FeatureFlagView {
  if (typeof value !== 'object' || value === null) return false;
  const record: Record<string, unknown> = { ...value };
  return FEATURE_FLAG_KEYS.every((key) => typeof record[key] === 'boolean');
}

export const getFeatureFlags = async (): Promise<FeatureFlagView> => {
  // A flag is a per-request answer, so reading one opts the route out of
  // static prerendering. Without this a gated page with nothing dynamic BEFORE
  // its check (crews: the check runs first, then auth and headers) prerenders
  // at build time; a build with the flag off bakes a static 404, and every
  // ISR re-render after the flip reaches auth(), throws DYNAMIC_SERVER_USAGE,
  // and keeps serving the stale 404. Production /crews did exactly that
  // (2026-11-10). Here rather than on each page, so no new gate can miss it.
  await connection();
  try {
    // Without a directive Next.js caches a server-component fetch for the life
    // of the build, which would freeze the flag map and make a flip in the
    // admin UI never reach the server-rendered routes. 30s matches both the
    // endpoint's own `max-age` and the client hook's `staleTime`, so a flip
    // takes the same half-minute everywhere.
    const raw = await publicApiClient.get<unknown>('/v1/flags', {
      next: { revalidate: 30 },
    });
    if (!isFeatureFlagView(raw)) {
      console.error('feature flags: unexpected payload');
      return featureFlagDefaults();
    }
    return raw;
  } catch (err) {
    // Fail open to the registry, which defaults the unreleased features off.
    // An unreachable API must never reveal something we have not shipped.
    console.error('feature flags: fetch failed, using defaults', err);
    return featureFlagDefaults();
  }
};

export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  const flags = await getFeatureFlags();
  return flags[key];
};
