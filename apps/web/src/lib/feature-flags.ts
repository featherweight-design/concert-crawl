import 'server-only';

import {
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  type FeatureFlagKey,
  type FeatureFlagView,
} from '@concert-crawl/entitlements';

import { connection } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { apiClient, publicApiClient } from '@/lib/api';

// The signed-in viewer's session token, or null for a signed-out visitor. A
// failure to read it is a signed-out answer, never a thrown 404.
async function viewerToken(): Promise<string | null> {
  try {
    const session = await auth();
    return session.userId ? await session.getToken() : null;
  } catch {
    return null;
  }
}

// apps/web has no zod dependency, so the boundary is narrowed with the same
// hand-written guard the client hook uses (`use-feature-flags.ts`). A partial
// or mistyped map is rejected outright so it can never turn a default-off
// flag on.
function isFeatureFlagView(value: unknown): value is FeatureFlagView {
  if (typeof value !== 'object' || value === null) return false;
  const record: Record<string, unknown> = { ...value };
  return FEATURE_FLAG_KEYS.every((key) => typeof record[key] === 'boolean');
}

// One read of the flag map. With no token it is the signed-out map, which is
// the same for every visitor and so stays cached; with a token it is that
// viewer's own map and is never cached by Next, so one viewer's answer cannot
// be served to another.
async function readFlags(token: string | null): Promise<FeatureFlagView> {
  try {
    // Without a directive Next.js caches a server-component fetch for the life
    // of the build, which would freeze the flag map and make a flip in the
    // admin UI never reach the server-rendered routes. 30s matches both the
    // endpoint's own `max-age` and the client hook's `staleTime`, so a flip
    // takes the same half-minute everywhere.
    const raw =
      token === null
        ? await publicApiClient.get<unknown>('/v1/flags', {
            next: { revalidate: 30 },
          })
        : await apiClient.get<unknown>('/v1/flags', token, {
            cache: 'no-store',
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
}

// A flag is a per-request answer, so reading one opts the route out of
// static prerendering. Without this a gated page with nothing dynamic BEFORE
// its check (crews: the check runs first, then auth and headers) prerenders
// at build time; a build with the flag off bakes a static 404, and every
// ISR re-render after the flip reaches auth(), throws DYNAMIC_SERVER_USAGE,
// and keeps serving the stale 404. Production /crews did exactly that
// (2026-11-10). Here rather than on each page, so no new gate can miss it.
//
// Outside any try on purpose: during prerendering connection() throws to
// interrupt static generation, and catching that would fall back to the
// defaults (crews off) and bake the 404 again. A route reading a flag must
// never set `dynamic = 'force-static'`, which turns this into a no-op. A
// test that renders a gated page must mock this module (or next/server):
// outside a request, connection() throws.

/**
 * The flag map as this viewer sees it. A flag at Me or Beta is on for some
 * people only, so the viewer's own token goes with the request, or a Me or Beta
 * user gets the signed-out map and a 404 on a page they should see.
 */
export const getFeatureFlags = async (): Promise<FeatureFlagView> => {
  await connection();
  return readFlags(await viewerToken());
};

/**
 * One flag, for this viewer. The signed-out map is read first (cached, shared):
 * a flag that is on for everyone needs nothing more, and neither does a
 * signed-out visitor, so those pages cost what they always did. Only a signed-in
 * viewer asking about a flag that is NOT on for everyone (it may be Me or Beta
 * for them) pays for a per-viewer read.
 */
export const isFeatureEnabled = async (
  key: FeatureFlagKey,
): Promise<boolean> => {
  await connection();
  const everyone = await readFlags(null);
  if (everyone[key]) return true;
  const token = await viewerToken();
  if (token === null) return false;
  const viewer = await readFlags(token);
  return viewer[key];
};
