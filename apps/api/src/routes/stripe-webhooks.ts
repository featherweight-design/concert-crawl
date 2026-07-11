// apps/api/src/routes/stripe-webhooks.ts
//
// POST /v1/webhooks/stripe (eng infra spec Part 2 §1.5, execution plan
// PR 2.3).
//
// Mounted with NO Clerk middleware and NO audit middleware (not
// user-initiated), and reads the raw body via ctx.req.text() — Stripe
// signature verification requires the exact bytes Stripe signed.
//
// Contract: 400 on missing/invalid signature; 200 on handled AND on
// duplicate; 500 only on genuine processing failure (Stripe retries).
// Idempotency per Part 1 Decision 4: INSERT into processed_stripe_events
// first; the handler runs only when the insert lands. On handler failure the
// idempotency row is removed so Stripe's retry re-processes instead of
// short-circuiting as a duplicate.

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, processedStripeEvents } from '@concert-crawl/db'
import type { BillingStripeClient, StripeVerifiedEvent } from '../lib/stripe.js'
import {
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handlePaymentIntentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '../lib/stripe-webhook-handlers.js'
import { apiLogger } from '../lib/logger.js'

// The exact event set the webhook endpoint registers for
// (scripts/stripe-provision.ts --webhooks keeps enabled_events in lockstep).
export const HANDLED_STRIPE_EVENTS = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_intent.payment_failed',
  'customer.updated',
  'payment_method.attached',
] as const

const readWebhookSecretFromEnv = (): string | null =>
  process.env['STRIPE_WEBHOOK_SECRET'] ?? null

export const createStripeWebhooksRouter = (
  getStripe: () => BillingStripeClient,
  getWebhookSecret: () => string | null = readWebhookSecretFromEnv,
): Hono => {
  const webhooksRouter = new Hono()

  webhooksRouter.post('/', async (ctx) => {
    const signature = ctx.req.header('stripe-signature')
    if (!signature) {
      return ctx.json(
        { success: false, error: 'Missing stripe-signature header' },
        400,
      )
    }

    const webhookSecret = getWebhookSecret()
    if (webhookSecret === null) {
      // Configuration failure, not a bad request — 500 so Stripe retries
      // once the env var is placed.
      apiLogger.error(
        {},
        'stripe-webhooks: STRIPE_WEBHOOK_SECRET is not set — cannot verify',
      )
      return ctx.json({ success: false, error: 'Webhook not configured' }, 500)
    }

    const rawBody = await ctx.req.text()
    let event: StripeVerifiedEvent
    try {
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      )
    } catch (err) {
      apiLogger.warn({ err }, 'stripe-webhooks: signature verification failed')
      return ctx.json({ success: false, error: 'Invalid signature' }, 400)
    }

    // Idempotency (Part 1 Decision 4): insert-first; a conflict means the
    // event was already processed — 200 duplicate short-circuit.
    const inserted = await db
      .insert(processedStripeEvents)
      .values({ eventId: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ eventId: processedStripeEvents.eventId })
    if (inserted.length === 0) {
      apiLogger.info(
        { stripeEventId: event.id, type: event.type },
        'stripe-webhooks: duplicate event — already processed',
      )
      return ctx.json({ success: true, duplicate: true })
    }

    try {
      await dispatchEvent(event, getStripe)
      return ctx.json({ success: true })
    } catch (err) {
      apiLogger.error(
        { err, stripeEventId: event.id, type: event.type },
        'stripe-webhooks: event processing failed',
      )
      // Remove the idempotency row so Stripe's retry re-processes rather
      // than short-circuiting as a duplicate.
      try {
        await db
          .delete(processedStripeEvents)
          .where(eq(processedStripeEvents.eventId, event.id))
      } catch (cleanupErr) {
        apiLogger.error(
          { err: cleanupErr, stripeEventId: event.id },
          'stripe-webhooks: failed to release idempotency row after processing failure',
        )
      }
      return ctx.json({ success: false, error: 'Processing failed' }, 500)
    }
  })

  return webhooksRouter
}

const dispatchEvent = async (
  event: StripeVerifiedEvent,
  getStripe: () => BillingStripeClient,
): Promise<void> => {
  const handlerContext = { stripe: getStripe(), stripeEventId: event.id }
  switch (event.type) {
    case 'checkout.session.completed':
      // Not used — no hosted Checkout in this architecture (Decision 2).
      // Registered defensively as a logged no-op (spec §1.5).
      apiLogger.info(
        { stripeEventId: event.id },
        'stripe-webhooks: checkout.session.completed — no-op (no hosted Checkout, Decision 2)',
      )
      return
    case 'invoice.payment_succeeded':
      return handleInvoicePaymentSucceeded(event.data.object, handlerContext)
    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event.data.object, handlerContext)
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object, handlerContext)
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object, handlerContext)
    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(event.data.object, handlerContext)
    case 'customer.updated':
    case 'payment_method.attached':
      // Spec §5.1 refreshes cached card metadata for the card-expiry timer,
      // but no card-cache columns exist yet (the daily billing job, PR 5.x,
      // ships them). Logged no-op until then — do NOT invent schema.
      apiLogger.info(
        { stripeEventId: event.id, type: event.type },
        'stripe-webhooks: card-metadata event — no-op until card cache lands (spec §5.1)',
      )
      return
    default:
      // Unregistered event types can still arrive (dashboard-side sends,
      // manual replays) — log + acknowledge, never 500.
      apiLogger.warn(
        { stripeEventId: event.id, type: event.type },
        'stripe-webhooks: unhandled event type — acknowledged without processing',
      )
  }
}
