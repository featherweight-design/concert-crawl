// apps/api/src/routes/billing-manage.ts
//
// POST /v1/billing/checkout-abandon + POST /v1/billing/portal-session
// (eng infra spec Part 2 §1.4, §3.2; execution plan PR 2.3).
//
// Sibling router to billing.ts (same /v1/billing mount) — kept separate so
// each file stays reviewable (~600-line ceiling).

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, subscriptions } from '@concert-crawl/db'
import type { BillingStripeClient } from '../lib/stripe.js'
import { stripeSubscriptionSchema } from '../lib/stripe-webhook-schemas.js'
import {
  parseFounderSeatNumber,
  restoreFounderSeat,
  subscriptionNeverPaid,
} from '../lib/founder-seats.js'
import { apiLogger } from '../lib/logger.js'

const abandonBodySchema = z.object({
  subscriptionId: z.string().min(1),
})

export const createBillingManageRouter = (
  getStripe: () => BillingStripeClient,
): Hono => {
  const manageRouter = new Hono()

  manageRouter.use('*', clerkMiddleware())

  // Best-effort abandon: the user dismissed the payment surface. Verifies
  // ownership, cancels iff the subscription is still `incomplete`, and
  // restores the founder seat (idempotent per claim, §3.2 path 1). Clients
  // that vanish without calling this are covered by the incomplete_expired
  // webhook path.
  manageRouter.post('/checkout-abandon', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    let rawBody: unknown = null
    try {
      rawBody = await ctx.req.json()
    } catch (err) {
      apiLogger.warn({ err, userId }, 'checkout-abandon: unparseable body')
    }
    const parsedBody = abandonBodySchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return ctx.json(
        {
          success: false,
          code: 'invalid_body',
          error: 'Body must be { subscriptionId: string }',
        },
        400,
      )
    }
    const { subscriptionId } = parsedBody.data

    try {
      const stripe = getStripe()
      let retrieved: unknown
      try {
        retrieved = await stripe.subscriptions.retrieve(subscriptionId)
      } catch (retrieveErr) {
        apiLogger.warn(
          { err: retrieveErr, userId, subscriptionId },
          'checkout-abandon: subscription not retrievable',
        )
        return ctx.json(
          {
            success: false,
            code: 'not_found',
            error: 'Subscription not found',
          },
          404,
        )
      }
      const parsedSubscription = stripeSubscriptionSchema.safeParse(retrieved)
      if (!parsedSubscription.success) {
        apiLogger.error(
          { userId, subscriptionId, issues: parsedSubscription.error.message },
          'checkout-abandon: subscription payload failed validation',
        )
        return ctx.json({ success: false, error: 'Internal server error' }, 500)
      }
      const snapshot = parsedSubscription.data

      // Ownership: the subscription was created with the claimant's Clerk
      // userId in metadata (billing.ts). 404 (not 403) so the endpoint never
      // confirms another user's subscription IDs exist.
      if (snapshot.metadata?.['userId'] !== userId) {
        apiLogger.warn(
          { userId, subscriptionId },
          'checkout-abandon: subscription not owned by caller',
        )
        return ctx.json(
          {
            success: false,
            code: 'not_found',
            error: 'Subscription not found',
          },
          404,
        )
      }

      // Cancel iff still incomplete (spec §1.4). Any other status means
      // payment landed or Stripe already expired it — the webhook paths own
      // those transitions; repeat abandon calls land here and stay 200.
      if (snapshot.status !== 'incomplete') {
        // Retry safety: a prior abandon call may have cancelled the
        // subscription and then crashed before restoring the seat. For
        // terminal never-paid claims, re-attempt the (idempotent per claim)
        // restore instead of returning early — otherwise a partial failure
        // leaves the seat permanently held.
        if (
          snapshot.status === 'canceled' ||
          snapshot.status === 'incomplete_expired'
        ) {
          const seatNumber = parseFounderSeatNumber(snapshot.metadata)
          if (
            seatNumber !== null &&
            (await subscriptionNeverPaid(subscriptionId))
          ) {
            await restoreFounderSeat({
              userId,
              subscriptionId,
              seatNumber,
              reason: 'checkout_abandoned',
            })
          }
        }
        return ctx.json({ success: true, data: { cancelled: false } })
      }

      await stripe.subscriptions.cancel(subscriptionId)

      const seatNumber = parseFounderSeatNumber(snapshot.metadata)
      if (seatNumber !== null) {
        await restoreFounderSeat({
          userId,
          subscriptionId,
          seatNumber,
          reason: 'checkout_abandoned',
        })
      }

      return ctx.json({ success: true, data: { cancelled: true } })
    } catch (err) {
      apiLogger.error(
        { err, userId, subscriptionId },
        'checkout-abandon: failed',
      )
      return ctx.json(
        { success: false, error: 'Failed to abandon checkout' },
        500,
      )
    }
  })

  // Stripe-hosted Billing Portal session (Decision 3, #780 hybrid split —
  // portal owns card change / invoices / billing email / tax; cancel and
  // plan-switch stay in-app).
  manageRouter.post('/portal-session', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    const [subscriptionRow] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)
    if (!subscriptionRow) {
      return ctx.json(
        {
          success: false,
          code: 'no_customer',
          error: 'No billing profile exists for this account',
        },
        404,
      )
    }

    try {
      const webOrigin = process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'
      const session = await getStripe().billingPortal.sessions.create({
        customer: subscriptionRow.stripeCustomerId,
        return_url: `${webOrigin}/settings/plan`,
      })
      return ctx.json({ success: true, data: { url: session.url } })
    } catch (err) {
      apiLogger.error({ err, userId }, 'portal-session: failed')
      return ctx.json(
        { success: false, error: 'Failed to create portal session' },
        500,
      )
    }
  })

  return manageRouter
}
