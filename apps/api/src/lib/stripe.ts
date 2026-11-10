// apps/api/src/lib/stripe.ts
//
// Stripe server SDK boundary. Since going free (2026-11-10) the only caller is
// account deletion, which cancels any subscription row still chargeable, so
// the client interface is the two calls it makes.
//
// The API version is pinned explicitly so dashboard-side version bumps never
// change behavior under us.

import Stripe from 'stripe';

// Matches the installed stripe SDK's pinned types (stripe@22.x).
export const STRIPE_API_VERSION = '2026-07-29.dahlia';

export interface BillingStripeClient {
  subscriptions: {
    retrieve(subscriptionId: string): Promise<unknown>;
    cancel(subscriptionId: string): Promise<unknown>;
  };
}

let cachedClient: Stripe | null = null;

/**
 * True when this environment can reach Stripe at all. Going free, the key is
 * being removed from every environment; callers that only tidy up old billing
 * rows check this first rather than letting getStripeClient throw.
 */
export const isStripeConfigured = (): boolean =>
  Boolean(process.env['STRIPE_SECRET_KEY']);

/**
 * Lazy singleton over the real Stripe SDK. Lazy so app construction (and
 * every test that builds the Hono app) never requires STRIPE_SECRET_KEY.
 * maxNetworkRetries retries transport failures with an auto-generated
 * idempotency key.
 */
export const getStripeClient = (): BillingStripeClient => {
  if (cachedClient === null) {
    const secretKey = process.env['STRIPE_SECRET_KEY'];
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    cachedClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
    });
  }
  return cachedClient;
};
