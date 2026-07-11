// apps/api/src/routes/billing.ts
//
// POST /v1/billing/checkout-session (eng infra spec Part 2 §1.3–§1.4,
// §3.1–§3.3; execution plan PR 2.2).
//
// Creates an incomplete Stripe subscription for the embedded Payment
// Element and returns { clientSecret, subscriptionId }. Deliberately writes
// NO subscriptions DB row — webhooks (PR 2.3) drive DB state; the only DB
// writes here are the founder atomic seat claim and subscription_events
// audit rows.

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  founderWindow,
  giftedComps,
  subscriptions,
  subscriptionEvents,
} from '@concert-crawl/db'
import type {
  BillingStripeClient,
  StripeSubscriptionCreateResult,
} from '../lib/stripe.js'
import { apiLogger } from '../lib/logger.js'

const checkoutBodySchema = z.object({
  tier: z.enum(['supporter', 'premium', 'founder']),
})

type CheckoutTier = z.infer<typeof checkoutBodySchema>['tier']

// Server code resolves prices by lookup_key, never hard-coded price IDs
// (spec §1.2 — IDs differ across test/live mode).
const TIER_LOOKUP_KEYS: Record<CheckoutTier, string> = {
  supporter: 'supporter_monthly',
  premium: 'premium_monthly',
  founder: 'founder_monthly',
}

// Statuses that block a new checkout (spec §1.4 — use change-tier instead).
const LIVE_SUBSCRIPTION_STATUSES: readonly string[] = [
  'active',
  'trialing',
  'past_due',
]

export type FounderGateFailure = {
  ok: false
  status: 403 | 410
  code:
    | 'founder_window_not_open'
    | 'founder_window_closed'
    | 'founder_seats_exhausted'
}

export type FounderGateResult = { ok: true } | FounderGateFailure

/**
 * Founder-only gates (spec §3.3), evaluated before any Stripe call. A
 * future opensAt is treated as not-open — the window has not started, which
 * is the same customer-facing state as pre-launch.
 */
export const evaluateFounderGates = (
  window: {
    opensAt: Date | null
    closesAt: Date | null
    seatsRemaining: number
  },
  now: Date,
): FounderGateResult => {
  if (window.opensAt === null || window.opensAt.getTime() > now.getTime()) {
    return { ok: false, status: 403, code: 'founder_window_not_open' }
  }
  // <= matches the atomic claim's gt(closesAt, now): a request exactly at
  // the boundary is closed here rather than failing the claim with a
  // misleading founder_seats_exhausted.
  if (window.closesAt !== null && window.closesAt.getTime() <= now.getTime()) {
    return { ok: false, status: 410, code: 'founder_window_closed' }
  }
  if (window.seatsRemaining <= 0) {
    return { ok: false, status: 410, code: 'founder_seats_exhausted' }
  }
  return { ok: true }
}

const GATE_MESSAGES: Record<FounderGateFailure['code'], string> = {
  founder_window_not_open: 'The founder window is not open yet',
  founder_window_closed: 'The founder window has closed',
  founder_seats_exhausted: 'All founder seats have been claimed',
}

/**
 * Narrows the expanded latest_invoice union to the PaymentIntent client
 * secret — runtime checks only, no casts. Returns null when the invoice was
 * not expanded or carries no confirmation secret.
 */
export const resolveClientSecret = (
  subscription: StripeSubscriptionCreateResult,
): string | null => {
  const invoice = subscription.latest_invoice
  if (typeof invoice !== 'object' || invoice === null) return null
  const confirmationSecret = invoice.confirmation_secret
  if (typeof confirmationSecret !== 'object' || confirmationSecret === null) {
    return null
  }
  const clientSecret = confirmationSecret.client_secret
  return typeof clientSecret === 'string' ? clientSecret : null
}

export const createBillingRouter = (
  getStripe: () => BillingStripeClient,
): Hono => {
  const billingRouter = new Hono()

  billingRouter.use('*', clerkMiddleware())

  billingRouter.post('/checkout-session', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    let rawBody: unknown = null
    try {
      rawBody = await ctx.req.json()
    } catch (err) {
      apiLogger.warn({ err, userId }, 'checkout-session: unparseable body')
    }
    const parsedBody = checkoutBodySchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return ctx.json(
        {
          success: false,
          code: 'invalid_body',
          error: "Body must be { tier: 'supporter' | 'premium' | 'founder' }",
        },
        400,
      )
    }
    const { tier } = parsedBody.data
    const now = new Date()

    // Founder gates run FIRST (spec §1.4/§3.3) — read-only singleton check
    // before the 409 checks and before any Stripe call.
    let seatsTotal = 0
    if (tier === 'founder') {
      const [windowRow] = await db
        .select()
        .from(founderWindow)
        .where(eq(founderWindow.id, 1))
        .limit(1)
      if (!windowRow) {
        apiLogger.error(
          { userId },
          'checkout-session: founder_window singleton row missing',
        )
        return ctx.json({ success: false, error: 'Internal server error' }, 500)
      }
      const gate = evaluateFounderGates(windowRow, now)
      if (!gate.ok) {
        return ctx.json(
          { success: false, code: gate.code, error: GATE_MESSAGES[gate.code] },
          gate.status,
        )
      }
      seatsTotal = windowRow.seatsTotal
    }

    // 409 — an active/trialing/past_due subscription must go through
    // change-tier, never a second checkout. The row (any status) also
    // carries the reusable stripeCustomerId.
    const [existingSubscription] = await db
      .select({
        status: subscriptions.status,
        stripeCustomerId: subscriptions.stripeCustomerId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)
    if (
      existingSubscription &&
      LIVE_SUBSCRIPTION_STATUSES.includes(existingSubscription.status)
    ) {
      return ctx.json(
        {
          success: false,
          code: 'subscription_exists',
          error:
            'You already have an active subscription — use change-tier instead',
        },
        409,
      )
    }

    // 409 — gifted users already have Premium; checkout is not for them.
    const [activeGift] = await db
      .select({ id: giftedComps.id })
      .from(giftedComps)
      .where(
        and(
          eq(giftedComps.userId, userId),
          isNull(giftedComps.revokedAt),
          or(isNull(giftedComps.expiresAt), gt(giftedComps.expiresAt, now)),
        ),
      )
      .limit(1)
    if (activeGift) {
      return ctx.json(
        {
          success: false,
          code: 'gifted_user',
          error: 'Your account already has gifted Premium access',
        },
        409,
      )
    }

    // 409 — one pending founder claim per user. Without this, repeated
    // checkouts would let one user hold many seats via incomplete
    // subscriptions; a held seat is only released by the §3.2 restoration
    // paths (abandon endpoint / incomplete_expired webhook, PR 2.3).
    if (tier === 'founder') {
      const claimEvents = await db
        .select({ type: subscriptionEvents.type })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.userId, userId),
            inArray(subscriptionEvents.type, [
              'founder_claimed',
              'founder_seat_restored',
            ]),
          ),
        )
      const claims = claimEvents.filter(
        (event) => event.type === 'founder_claimed',
      ).length
      const restores = claimEvents.length - claims
      if (claims > restores) {
        return ctx.json(
          {
            success: false,
            code: 'founder_claim_pending',
            error:
              'You already have a founder checkout in progress — finish or abandon it first',
          },
          409,
        )
      }
    }

    // Founder atomic claim (spec §3.1) — single guarded UPDATE, before
    // subscription creation. An empty result means the seat race was lost
    // between the gate check and the decrement.
    let founderSeatNumber: number | null = null
    if (tier === 'founder') {
      const claimed = await db
        .update(founderWindow)
        .set({ seatsRemaining: sql`${founderWindow.seatsRemaining} - 1` })
        .where(
          and(
            eq(founderWindow.id, 1),
            gt(founderWindow.seatsRemaining, 0),
            isNotNull(founderWindow.opensAt),
            lte(founderWindow.opensAt, now),
            gt(founderWindow.closesAt, now),
          ),
        )
        .returning({ seatsRemaining: founderWindow.seatsRemaining })
      const claimedRow = claimed[0]
      if (!claimedRow) {
        return ctx.json(
          {
            success: false,
            code: 'founder_seats_exhausted',
            error: GATE_MESSAGES.founder_seats_exhausted,
          },
          410,
        )
      }
      founderSeatNumber = seatsTotal - claimedRow.seatsRemaining
    }

    // NULL until Stripe subscription creation succeeds — the catch below
    // must NOT restore the founder seat once the incomplete subscription
    // exists (it holds the seat; §3.2 restoration paths reconcile it).
    let createdSubscription: StripeSubscriptionCreateResult | null = null
    try {
      // Inside the try so a failed audit insert restores the claimed seat.
      if (founderSeatNumber !== null) {
        await db.insert(subscriptionEvents).values({
          userId,
          type: 'founder_claimed',
          metadata: { seatNumber: founderSeatNumber },
        })
      }

      const stripe = getStripe()

      // Ensure a Stripe customer — reuse the ID from any prior subscription
      // row; the incomplete subscription created below holds the seat.
      let stripeCustomerId = existingSubscription?.stripeCustomerId ?? null
      if (stripeCustomerId === null) {
        const customer = await stripe.customers.create({
          metadata: { userId },
        })
        stripeCustomerId = customer.id
      }

      const lookupKey = TIER_LOOKUP_KEYS[tier]
      const priceList = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
      })
      if (priceList.data.length > 1) {
        // Multiple active prices on one lookup_key means Stripe state has
        // drifted — charging an arbitrary data[0] risks incorrect billing.
        throw new Error(
          `Multiple active Stripe prices for lookup_key "${lookupKey}" — resolve the duplicate in the Stripe dashboard`,
        )
      }
      const price = priceList.data[0]
      if (!price) {
        throw new Error(
          `No active Stripe price for lookup_key "${lookupKey}" — run scripts/stripe-provision.ts`,
        )
      }

      createdSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        // API 2026-06-24.dahlia: `latest_invoice.payment_intent` no longer
        // exists as an expansion — confirmation_secret carries the same
        // PaymentIntent client_secret for the Payment Element.
        expand: ['latest_invoice.confirmation_secret'],
        metadata: {
          userId,
          ...(founderSeatNumber !== null
            ? { founderSeatNumber: String(founderSeatNumber) }
            : {}),
        },
      })

      const clientSecret = resolveClientSecret(createdSubscription)
      if (clientSecret === null) {
        throw new Error(
          'Stripe subscription create returned no confirmation client secret',
        )
      }

      // Best-effort audit — the checkout already succeeded, so a failed
      // insert must not 500 a response the client can act on.
      try {
        await db.insert(subscriptionEvents).values({
          userId,
          type: 'checkout_started',
          metadata: { tier, subscriptionId: createdSubscription.id },
        })
      } catch (auditErr) {
        apiLogger.error(
          { err: auditErr, userId, tier },
          'checkout-session: checkout_started audit insert failed',
        )
      }

      return ctx.json({
        success: true,
        data: {
          clientSecret,
          subscriptionId: createdSubscription.id,
          founderSeatNumber,
        },
      })
    } catch (err) {
      apiLogger.error(
        { err, userId, tier },
        'checkout-session: Stripe checkout failed',
      )
      // A claimed founder seat must not leak when Stripe fails after the
      // claim — restore it (guarded so seats never exceed seatsTotal).
      // Never restore once the incomplete subscription exists: it holds the
      // seat, and incrementing here would oversell founder seats.
      if (founderSeatNumber !== null && createdSubscription !== null) {
        apiLogger.error(
          {
            userId,
            seatNumber: founderSeatNumber,
            subscriptionId: createdSubscription.id,
          },
          'checkout-session: post-create failure — seat held by incomplete subscription',
        )
      }
      if (founderSeatNumber !== null && createdSubscription === null) {
        try {
          await db
            .update(founderWindow)
            .set({ seatsRemaining: sql`${founderWindow.seatsRemaining} + 1` })
            .where(
              and(
                eq(founderWindow.id, 1),
                lt(founderWindow.seatsRemaining, founderWindow.seatsTotal),
              ),
            )
          await db.insert(subscriptionEvents).values({
            userId,
            type: 'founder_seat_restored',
            metadata: {
              seatNumber: founderSeatNumber,
              reason: 'checkout_failure',
            },
          })
        } catch (restoreErr) {
          apiLogger.error(
            { err: restoreErr, userId, seatNumber: founderSeatNumber },
            'checkout-session: founder seat restore failed',
          )
        }
      }
      return ctx.json(
        { success: false, error: 'Failed to start checkout' },
        500,
      )
    }
  })

  return billingRouter
}
