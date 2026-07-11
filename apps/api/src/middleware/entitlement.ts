import { getAuth } from '@hono/clerk-auth'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { canUseFeature } from '@concert-crawl/entitlements'
import type { PremiumFeature } from '@concert-crawl/entitlements'
import type { PlanState } from '@concert-crawl/types'
import { loadPlanState } from '../lib/plan.js'
import { apiLogger } from '../lib/logger.js'

// Machine-readable code the web client switches on to route a 403 into the
// locked-surface treatment (paywall / tier picker) instead of a generic error.
export const ENTITLEMENT_REQUIRED_CODE = 'entitlement_required'

export interface EntitlementVariables {
  planState: PlanState
}

// Shape of the custom claims added by our Clerk JWT template:
//   { "metadata": "{{user.public_metadata}}" }
// Only extracts the metadata claim — loadPlanState owns validating its
// contents, so duplicating its field schema here would just drift.
const claimsSchema = z.object({
  metadata: z.unknown(),
})

// requireFeature — server-side entitlement gate for paid features.
// Derives PlanState from the DB (same derivation as GET /v1/users/me) and
// returns 403 with a typed error code when the plan lacks the feature.
// Client-side lockedSurface() gating is UX only — every endpoint serving
// paid-feature data must mount this. Must run after clerkMiddleware().
export function requireFeature(
  feature: PremiumFeature,
): MiddlewareHandler<{ Variables: EntitlementVariables }> {
  return async (ctx, next) => {
    const auth = getAuth(ctx)

    if (!auth?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }

    // Pass the raw claim through — loadPlanState accepts unknown and
    // handles missing/invalid metadata at its own boundary.
    const claims = claimsSchema.safeParse(auth.sessionClaims)
    const metadata = claims.success ? claims.data.metadata : undefined

    const planState = await loadPlanState(auth.userId, metadata)

    if (!canUseFeature(planState, feature)) {
      // debug, not info: denials are expected traffic (free/supporter users
      // tapping paid surfaces) and would flood default LOG_LEVEL=info.
      apiLogger.debug(
        { userId: auth.userId, feature, plan: planState.plan },
        'entitlement gate denied',
      )
      return ctx.json(
        {
          success: false,
          error: 'This feature requires an upgraded plan',
          code: ENTITLEMENT_REQUIRED_CODE,
          feature,
        },
        403,
      )
    }

    // Downstream handlers can read the derived state without re-querying.
    ctx.set('planState', planState)
    await next()
  }
}
