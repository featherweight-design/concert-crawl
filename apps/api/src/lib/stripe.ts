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
export const STRIPE_API_VERSION = '2026-06-24.dahlia'

export interface StripeCustomerCreateResult {
  id: string
}

// Expanded `latest_invoice.confirmation_secret` shape. Under API version
// 2026-06-24.dahlia the legacy `invoice.payment_intent` field no longer
// exists; the Payment Element client secret is surfaced via the invoice's
// confirmation_secret (same PaymentIntent client_secret value).
export interface StripeInvoiceConfirmationSecret {
  client_secret: string
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
    cachedClient = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
  }
  return cachedClient
}
