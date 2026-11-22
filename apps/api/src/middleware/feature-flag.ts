import type { FeatureFlagKey } from '@concert-crawl/entitlements';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import type { MiddlewareHandler } from 'hono';

import { isFeatureEnabled } from '../lib/feature-flags.js';
import { flagViewerFrom } from '../lib/flag-ladder.js';
import { apiLogger } from '../lib/logger.js';

/**
 * Gates a router on a release flag. Mount this with `router.use('*', ...)` at
 * the top of the router file so it runs ahead of any per-route plan
 * gate: a flagged-off premium route must answer 404, not leak a
 * 403 upsell for something customers cannot buy yet.
 *
 * A flag at Me or Beta is on for some people only, so the gate needs to know
 * who is asking. It runs BEFORE the router's own `clerkMiddleware`, so there is
 * no auth on the context yet: when the flag is not already on for everyone, it
 * verifies the bearer token itself (a local JWT check that never rejects a
 * request; an absent or bad token is just signed out) and asks again with the
 * viewer. A flag at Everyone or one nobody can reach never pays for it.
 */
export const requireFlag = (key: FeatureFlagKey): MiddlewareHandler => {
  const verifyViewer = clerkMiddleware();
  return async (ctx, next) => {
    let enabled = false;
    try {
      enabled = await isFeatureEnabled(key);
      if (!enabled) {
        await verifyViewer(ctx, async () => {});
        enabled = await isFeatureEnabled(key, flagViewerFrom(getAuth(ctx)));
      }
    } catch (err) {
      apiLogger.error({ err, key }, 'feature flag gate lookup failed');
    }

    if (!enabled) {
      // ctx.notFound() routes through the app's own not-found handler, so the
      // response is byte-identical to an unrouted path. A bespoke JSON body
      // here would be a tell that the route exists but is switched off.
      return ctx.notFound();
    }

    await next();
  };
};
