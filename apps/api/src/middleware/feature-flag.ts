import type { FeatureFlagKey } from '@concert-crawl/entitlements'
import type { MiddlewareHandler } from 'hono'

import { isFeatureEnabled } from '../lib/feature-flags.js'
import { apiLogger } from '../lib/logger.js'

/**
 * Gates a router on a release flag. Mount this with `router.use('*', ...)` at
 * the top of the router file so it runs ahead of any per-route
 * `requireFeature`: a flagged-off premium route must answer 404, not leak a
 * 403 upsell for something customers cannot buy yet.
 */
export const requireFlag = (key: FeatureFlagKey): MiddlewareHandler => {
  return async (ctx, next) => {
    let enabled = false
    try {
      enabled = await isFeatureEnabled(key)
    } catch (err) {
      apiLogger.error({ err, key }, 'feature flag gate lookup failed')
    }

    if (!enabled) {
      // ctx.notFound() routes through the app's own not-found handler, so the
      // response is byte-identical to an unrouted path. A bespoke JSON body
      // here would be a tell that the route exists but is switched off.
      return ctx.notFound()
    }

    await next()
  }
}
