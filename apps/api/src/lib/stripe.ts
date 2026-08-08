// apps/api/src/lib/stripe.ts
//
// Stripe server SDK boundary (eng infra spec Part 2 §1.1, §10).
//
// The API version is pinned explicitly so dashboard-side version bumps never
// change behavior under us. `BillingStripeClient` is a minimal structural
// interface over the slice of the SDK the billing routes use — routers take
// a client provider (dependency injection), so tests stub at the SDK
// boundary with a fake client and never touch the network (spec §10).

import Stripe from 'stripe'

// Matches the installed stripe SDK's pinned types (stripe@22.x).
export const STRIPE_API_VERSION = '2026-07-29.dahlia'

export interface StripeCustomerCreateResult {
  id: string
}

// Expanded `latest_invoice.confirmation_secret` shape. Since the dahlia
// releases the legacy `invoice.payment_intent` field no longer exists; the
// Payment Element client secret is surfaced via the invoice's
// confirmation_secret (same PaymentIntent client_secret value).
export interface StripeInvoiceConfirmationSecret {
  client_secret: string | null
}

export interface StripeSubscriptionCreateResult {
  id: string
  latest_invoice?:
    | string
    | null
    | {
        confirmation_secret?: StripeInvoiceConfirmationSecret | null
      }
}

export interface StripeSubscriptionCreateParams {
  customer: string
  items: { price: string }[]
  payment_behavior: 'default_incomplete'
  payment_settings: { save_default_payment_method: 'on_subscription' }
  expand: string[]
  metadata: Record<string, string>
}

// Lifecycle updates (PR 4.5): cancel-schedule flips and tier changes both go
// through subscriptions.update — one params slice covers both call shapes.
export interface StripeSubscriptionUpdateParams {
  cancel_at_period_end?: boolean
  items?: { id: string; price: string }[]
  proration_behavior?: 'always_invoice' | 'create_prorations'
}

// Upcoming-invoice preview (spec §1.4 proration-preview) — previews the
// effect of a subscription item price change without mutating anything.
export interface StripeInvoicePreviewParams {
  customer: string
  subscription: string
  subscription_details: {
    items: { id: string; price: string }[]
    proration_behavior: 'always_invoice' | 'create_prorations'
  }
}

// Minimal verified-event shape — the payload object is `unknown` on purpose;
// handlers Zod-parse the slice of each event they consume (boundary data).
export interface StripeVerifiedEvent {
  id: string
  type: string
  data: { object: unknown }
}

export interface BillingStripeClient {
  customers: {
    create(params: {
      metadata: { userId: string }
    }): Promise<StripeCustomerCreateResult>
  }
  prices: {
    list(params: {
      lookup_keys: string[]
      active: boolean
    }): Promise<{ data: { id: string }[] }>
  }
  subscriptions: {
    create(
      params: StripeSubscriptionCreateParams,
    ): Promise<StripeSubscriptionCreateResult>
    // Returns `unknown` — webhook/abandon paths Zod-parse the snapshot they
    // consume (boundary data never trusted structurally).
    retrieve(subscriptionId: string): Promise<unknown>
    cancel(subscriptionId: string): Promise<unknown>
    update(
      subscriptionId: string,
      params: StripeSubscriptionUpdateParams,
    ): Promise<unknown>
  }
  invoices: {
    // Returns `unknown` — the lifecycle routes Zod-parse the invoice slice
    // they consume (boundary data never trusted structurally).
    createPreview(params: StripeInvoicePreviewParams): Promise<unknown>
  }
  billingPortal: {
    sessions: {
      create(params: {
        customer: string
        return_url: string
      }): Promise<{ url: string }>
    }
  }
  webhooks: {
    constructEvent(
      rawBody: string,
      signatureHeader: string,
      webhookSecret: string,
    ): StripeVerifiedEvent
  }
}

let cachedClient: Stripe | null = null

/**
 * Lazy singleton over the real Stripe SDK. Lazy so app construction (and
 * every test that builds the Hono app) never requires STRIPE_SECRET_KEY —
 * the key is only read on the first billing request.
 */
export const getStripeClient = (): BillingStripeClient => {
  if (cachedClient === null) {
    const secretKey = process.env['STRIPE_SECRET_KEY']
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    // maxNetworkRetries makes the SDK retry transport failures with an
    // auto-generated idempotency key, so a subscription created just before
    // a dropped response is returned (not duplicated) on retry — without
    // this, such a failure would restore a founder seat the incomplete
    // subscription still holds.
    cachedClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
    })
  }
  return cachedClient
}
