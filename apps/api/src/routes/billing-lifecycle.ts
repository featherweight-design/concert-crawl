// apps/api/src/routes/billing-lifecycle.ts
//
// POST /v1/billing/cancel + POST /v1/billing/resubscribe +
// POST /v1/billing/change-tier + GET /v1/billing/proration-preview
// (eng infra spec Part 2 §1.4; #780 §3; execution plan PR 4.5).
//
// Sibling router to billing.ts / billing-manage.ts (same /v1/billing mount)
// — kept separate so each file stays reviewable (~600-line ceiling).
//
// Stripe is the source of truth: every mutation calls Stripe first, then
// mirrors the result to the subscriptions row optimistically — the webhook
// path (customer.subscription.updated) confirms later. Because the mirror is
// updated before the webhook lands, the webhook's flip detection sees no
// change and does not write duplicate cancel_scheduled/resubscribed events.

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, subscriptions, subscriptionEvents } from '@concert-crawl/db'
import type { BillingStripeClient } from '../lib/stripe.js'
import {
  epochSecondsToDate,
  stripeSubscriptionSchema,
} from '../lib/stripe-webhook-schemas.js'
import { apiLogger } from '../lib/logger.js'

// Statuses on which lifecycle actions operate — mirrors billing.ts's "use
// change-tier instead" gate (spec §1.4).
const LIVE_SUBSCRIPTION_STATUSES: readonly string[] = [
  'active',
  'trialing',
  'past_due',
]

// Founder is claim-only (spec §1.4) — never a change-tier *target*. It IS a
// valid *source*: #780 decision 6 routes founder's cancel retention and
// "Change plan" into the Supporter downgrade confirm flow, so the switch is
// always an explicit confirmation, never silent.
export type SwitchableTier = 'supporter' | 'premium'
export type ChangeSourceTier = SwitchableTier | 'founder'

const changeTierBodySchema = z.object({
  tier: z.enum(['supporter', 'premium', 'founder']),
})

const prorationPreviewQuerySchema = z.object({
  tier: z.enum(['supporter', 'premium', 'founder']),
})

// Server code resolves prices by lookup_key, never hard-coded price IDs
// (spec §1.2 — IDs differ across test/live mode).
const TIER_LOOKUP_KEYS: Record<SwitchableTier, string> = {
  supporter: 'supporter_monthly',
  premium: 'premium_monthly',
}

export type ChangeTierDirection = 'upgrade' | 'downgrade'

// Monthly price in dollars — direction is purely "does the price go up?"
// (supporter $2 < founder $3 < premium $5).
const TIER_MONTHLY_PRICE: Record<ChangeSourceTier, number> = {
  supporter: 2,
  founder: 3,
  premium: 5,
}

export const resolveChangeDirection = (
  fromTier: ChangeSourceTier,
  toTier: SwitchableTier,
): ChangeTierDirection =>
  TIER_MONTHLY_PRICE[toTier] > TIER_MONTHLY_PRICE[fromTier]
    ? 'upgrade'
    : 'downgrade'

/**
 * Decision 8: upgrades invoice the proration immediately (Premium unlocks
 * now); downgrades credit the unused Premium time to the customer balance.
 */
export const PRORATION_BEHAVIOR: Record<
  ChangeTierDirection,
  'always_invoice' | 'create_prorations'
> = {
  upgrade: 'always_invoice',
  downgrade: 'create_prorations',
}

// Slice of the Stripe preview invoice the disclosure line consumes. Line
// amounts are enough to isolate the credit — proration credits are the only
// negative lines a tier-change preview produces.
const previewInvoiceSchema = z.object({
  amount_due: z.number(),
  currency: z.string(),
  period_end: z.number().nullish(),
  lines: z
    .object({ data: z.array(z.object({ amount: z.number() })) })
    .nullish(),
})

export interface ProrationPreviewSummary {
  /** What the customer pays now (upgrade) or on the next invoice. Never negative. */
  amountDueCents: number
  /** Total proration credit (negative preview lines, sign-flipped). */
  creditCents: number
  currency: string
  /** End of the previewed billing period (ISO), null if Stripe omits it. */
  periodEnd: string | null
}

/**
 * Flattens a Stripe upcoming-invoice preview into the
 * { amountDueCents, creditCents, currency, periodEnd } contract shape.
 * Null ⇒ the payload failed validation (caller logs + 500s pre-mutation).
 */
export const summarizeProrationPreview = (
  rawInvoice: unknown,
): ProrationPreviewSummary | null => {
  const parsed = previewInvoiceSchema.safeParse(rawInvoice)
  if (!parsed.success) return null
  const invoice = parsed.data
  const creditCents = (invoice.lines?.data ?? [])
    .filter((line) => line.amount < 0)
    .reduce((creditSum, line) => creditSum - line.amount, 0)
  return {
    amountDueCents: Math.max(invoice.amount_due, 0),
    creditCents,
    currency: invoice.currency,
    periodEnd: epochSecondsToDate(invoice.period_end)?.toISOString() ?? null,
  }
}

interface LiveSubscriptionRow {
  stripeCustomerId: string
  stripeSubscriptionId: string
  tier: 'free' | 'premium' | 'supporter' | 'founder'
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date
}

/** The user's subscription row iff it is in a live status; null otherwise. */
const findLiveSubscription = async (
  userId: string,
): Promise<LiveSubscriptionRow | null> => {
  const [subscriptionRow] = await db
    .select({
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      tier: subscriptions.tier,
      status: subscriptions.status,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  if (
    !subscriptionRow ||
    !LIVE_SUBSCRIPTION_STATUSES.includes(subscriptionRow.status)
  ) {
    return null
  }
  return subscriptionRow
}

// Best-effort audit — by the time an event row is written, Stripe and the
// subscriptions mirror have already been updated, so a failed insert must
// not 500 a response the client can act on (same pattern as billing.ts).
const insertEventBestEffort = async (
  values: typeof subscriptionEvents.$inferInsert,
): Promise<void> => {
  try {
    await db.insert(subscriptionEvents).values(values)
  } catch (auditErr) {
    apiLogger.error(
      { err: auditErr, userId: values.userId, type: values.type },
      'billing-lifecycle: audit event insert failed',
    )
  }
}

const noLiveSubscriptionResponse = {
  success: false,
  code: 'no_live_subscription',
  error: 'No active subscription found for this account',
} as const

/**
 * Resolves the active Stripe price for a lookup_key — same drift guards as
 * checkout (billing.ts): duplicates and missing prices are Stripe-state
 * errors that must surface loudly, never bill an arbitrary price.
 */
const resolvePriceIdByLookupKey = async (
  stripe: BillingStripeClient,
  lookupKey: string,
): Promise<string> => {
  const priceList = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
  })
  if (priceList.data.length > 1) {
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
  return price.id
}

interface TierChangePlan {
  fromTier: ChangeSourceTier
  toTier: SwitchableTier
  direction: ChangeTierDirection
  prorationBehavior: 'always_invoice' | 'create_prorations'
}

type TierChangeGuardFailure = {
  ok: false
  status: 409
  code: 'founder_not_switchable' | 'tier_unchanged' | 'tier_not_switchable'
  error: string
}

type TierChangeGuardResult =
  { ok: true; plan: TierChangePlan } | TierChangeGuardFailure

/**
 * Shared change-tier/preview guards: founder is never a target (claim-only,
 * though it IS a valid source — see ChangeSourceTier), same-tier is a no-op,
 * and a live row outside the paid tiers (e.g. 'free' — inconsistent state)
 * cannot switch.
 */
export const evaluateTierChange = (
  currentTier: LiveSubscriptionRow['tier'],
  targetTier: 'supporter' | 'premium' | 'founder',
): TierChangeGuardResult => {
  if (targetTier === 'founder') {
    return {
      ok: false,
      status: 409,
      code: 'founder_not_switchable',
      error: 'Founder is claim-only and cannot be switched to',
    }
  }
  if (currentTier === targetTier) {
    return {
      ok: false,
      status: 409,
      code: 'tier_unchanged',
      error: 'You are already on that tier',
    }
  }
  if (
    currentTier !== 'supporter' &&
    currentTier !== 'premium' &&
    currentTier !== 'founder'
  ) {
    return {
      ok: false,
      status: 409,
      code: 'tier_not_switchable',
      error: 'Your current plan cannot be switched in-app',
    }
  }
  const direction = resolveChangeDirection(currentTier, targetTier)
  return {
    ok: true,
    plan: {
      fromTier: currentTier,
      toTier: targetTier,
      direction,
      prorationBehavior: PRORATION_BEHAVIOR[direction],
    },
  }
}

/**
 * Retrieves the live subscription from Stripe and returns its first item ID
 * (`si_…`) — required for the item-level price switch. Throws on drift
 * (missing item/ID means our mirror and Stripe disagree structurally).
 */
const resolveSubscriptionItemId = async (
  stripe: BillingStripeClient,
  subscriptionId: string,
): Promise<string> => {
  const retrieved = await stripe.subscriptions.retrieve(subscriptionId)
  const parsedSubscription = stripeSubscriptionSchema.safeParse(retrieved)
  if (!parsedSubscription.success) {
    throw new Error(
      `change-tier: subscription payload failed validation — ${parsedSubscription.error.message}`,
    )
  }
  const itemId = parsedSubscription.data.items?.data[0]?.id ?? null
  if (itemId === null) {
    throw new Error(
      `change-tier: subscription ${subscriptionId} has no item ID — cannot switch price`,
    )
  }
  return itemId
}

export const createBillingLifecycleRouter = (
  getStripe: () => BillingStripeClient,
): Hono => {
  const lifecycleRouter = new Hono()

  lifecycleRouter.use('*', clerkMiddleware())

  // Schedule a cancel at period end (#780 §3 — grandfather-forever: access
  // continues through the paid period; the deleted webhook completes it).
  lifecycleRouter.post('/cancel', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    const subscriptionRow = await findLiveSubscription(userId)
    if (!subscriptionRow) {
      return ctx.json(noLiveSubscriptionResponse, 404)
    }
    if (subscriptionRow.cancelAtPeriodEnd) {
      return ctx.json(
        {
          success: false,
          code: 'cancel_already_scheduled',
          error: 'Your subscription is already set to cancel at period end',
        },
        409,
      )
    }

    try {
      await getStripe().subscriptions.update(
        subscriptionRow.stripeSubscriptionId,
        { cancel_at_period_end: true },
      )
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId))
      await insertEventBestEffort({
        userId,
        type: 'cancel_scheduled',
        metadata: {
          subscriptionId: subscriptionRow.stripeSubscriptionId,
          source: 'in_app',
        },
      })
      return ctx.json({
        success: true,
        data: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: subscriptionRow.currentPeriodEnd.toISOString(),
        },
      })
    } catch (err) {
      apiLogger.error({ err, userId }, 'billing/cancel: failed')
      return ctx.json(
        { success: false, error: 'Failed to cancel subscription' },
        500,
      )
    }
  })

  // Undo a scheduled cancel — only meaningful inside cancel-grace (live sub
  // with cancel_at_period_end set).
  lifecycleRouter.post('/resubscribe', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    const subscriptionRow = await findLiveSubscription(userId)
    if (!subscriptionRow) {
      return ctx.json(noLiveSubscriptionResponse, 404)
    }
    if (!subscriptionRow.cancelAtPeriodEnd) {
      return ctx.json(
        {
          success: false,
          code: 'not_in_cancel_grace',
          error: 'Your subscription is not scheduled to cancel',
        },
        409,
      )
    }

    try {
      await getStripe().subscriptions.update(
        subscriptionRow.stripeSubscriptionId,
        { cancel_at_period_end: false },
      )
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId))
      await insertEventBestEffort({
        userId,
        type: 'resubscribed',
        metadata: {
          subscriptionId: subscriptionRow.stripeSubscriptionId,
          source: 'in_app',
        },
      })
      return ctx.json({
        success: true,
        data: { cancelAtPeriodEnd: false },
      })
    } catch (err) {
      apiLogger.error({ err, userId }, 'billing/resubscribe: failed')
      return ctx.json({ success: false, error: 'Failed to resubscribe' }, 500)
    }
  })

  // Tier switch (supporter ↔ premium, founder → either) on the existing
  // subscription — never a new subscription (spec §1.3). The proration
  // preview runs BEFORE the update so a preview failure aborts with nothing
  // mutated.
  lifecycleRouter.post('/change-tier', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    let rawBody: unknown = null
    try {
      rawBody = await ctx.req.json()
    } catch (err) {
      apiLogger.warn({ err, userId }, 'change-tier: unparseable body')
    }
    const parsedBody = changeTierBodySchema.safeParse(rawBody)
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

    const subscriptionRow = await findLiveSubscription(userId)
    if (!subscriptionRow) {
      return ctx.json(noLiveSubscriptionResponse, 404)
    }
    const guard = evaluateTierChange(subscriptionRow.tier, parsedBody.data.tier)
    if (!guard.ok) {
      return ctx.json(
        { success: false, code: guard.code, error: guard.error },
        guard.status,
      )
    }
    const { fromTier, toTier, direction, prorationBehavior } = guard.plan

    try {
      const stripe = getStripe()
      const itemId = await resolveSubscriptionItemId(
        stripe,
        subscriptionRow.stripeSubscriptionId,
      )
      const newPriceId = await resolvePriceIdByLookupKey(
        stripe,
        TIER_LOOKUP_KEYS[toTier],
      )

      const previewRaw = await stripe.invoices.createPreview({
        customer: subscriptionRow.stripeCustomerId,
        subscription: subscriptionRow.stripeSubscriptionId,
        subscription_details: {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: prorationBehavior,
        },
      })
      const preview = summarizeProrationPreview(previewRaw)
      if (preview === null) {
        // Nothing mutated yet — fail loudly rather than change the tier
        // without the disclosure amount the response contract promises.
        throw new Error(
          'change-tier: proration preview payload failed validation',
        )
      }

      await stripe.subscriptions.update(subscriptionRow.stripeSubscriptionId, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: prorationBehavior,
      })

      await db
        .update(subscriptions)
        .set({ tier: toTier, stripePriceId: newPriceId, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId))

      // subscription_event_type has no generic tier_changed value —
      // upgraded/downgraded are the schema's tier-change events (spec §5).
      await insertEventBestEffort({
        userId,
        type: direction === 'upgrade' ? 'upgraded' : 'downgraded',
        metadata: {
          subscriptionId: subscriptionRow.stripeSubscriptionId,
          fromTier,
          toTier,
          prorationBehavior,
          amountDueCents: preview.amountDueCents,
          creditCents: preview.creditCents,
          currency: preview.currency,
        },
      })

      return ctx.json({
        success: true,
        data: {
          tier: toTier,
          direction,
          amountDueCents: preview.amountDueCents,
          creditCents: preview.creditCents,
          currency: preview.currency,
        },
      })
    } catch (err) {
      apiLogger.error({ err, userId, fromTier, toTier }, 'change-tier: failed')
      return ctx.json({ success: false, error: 'Failed to change tier' }, 500)
    }
  })

  // Read-only "$X.XX" preview for the confirm surface — same guards as
  // change-tier so the client cannot preview an impossible switch.
  lifecycleRouter.get('/proration-preview', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    const parsedQuery = prorationPreviewQuerySchema.safeParse({
      tier: ctx.req.query('tier'),
    })
    if (!parsedQuery.success) {
      return ctx.json(
        {
          success: false,
          code: 'invalid_query',
          error:
            'Query must include ?tier=supporter, ?tier=premium, or ?tier=founder',
        },
        400,
      )
    }

    const subscriptionRow = await findLiveSubscription(userId)
    if (!subscriptionRow) {
      return ctx.json(noLiveSubscriptionResponse, 404)
    }
    const guard = evaluateTierChange(
      subscriptionRow.tier,
      parsedQuery.data.tier,
    )
    if (!guard.ok) {
      return ctx.json(
        { success: false, code: guard.code, error: guard.error },
        guard.status,
      )
    }
    const { toTier, direction, prorationBehavior } = guard.plan

    try {
      const stripe = getStripe()
      const itemId = await resolveSubscriptionItemId(
        stripe,
        subscriptionRow.stripeSubscriptionId,
      )
      const newPriceId = await resolvePriceIdByLookupKey(
        stripe,
        TIER_LOOKUP_KEYS[toTier],
      )
      const previewRaw = await stripe.invoices.createPreview({
        customer: subscriptionRow.stripeCustomerId,
        subscription: subscriptionRow.stripeSubscriptionId,
        subscription_details: {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: prorationBehavior,
        },
      })
      const preview = summarizeProrationPreview(previewRaw)
      if (preview === null) {
        throw new Error('proration-preview: preview payload failed validation')
      }
      return ctx.json({
        success: true,
        data: {
          direction,
          amountDueCents: preview.amountDueCents,
          creditCents: preview.creditCents,
          currency: preview.currency,
          periodEnd: preview.periodEnd,
        },
      })
    } catch (err) {
      apiLogger.error(
        { err, userId, tier: parsedQuery.data.tier },
        'proration-preview: failed',
      )
      return ctx.json(
        { success: false, error: 'Failed to preview proration' },
        500,
      )
    }
  })

  return lifecycleRouter
}
