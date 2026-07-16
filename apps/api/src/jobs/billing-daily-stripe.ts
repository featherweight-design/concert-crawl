// apps/api/src/jobs/billing-daily-stripe.ts
//
// Stripe boundary for the daily billing job (§5.1). The base
// BillingStripeClient (lib/stripe.ts) covers the request/webhook slice of the
// SDK; the job needs two extra reads it does NOT model:
//   - the customer's default card (fingerprint + exp) for card-expiry warnings
//   - a subscription's live status for the dunning fallback sweep
//
// This is a narrow structural interface (dependency-injectable) so the job's
// unit tests stub it with a fake and never touch the network — same pattern as
// lib/stripe.ts's BillingStripeClient.

import Stripe from 'stripe'
import { STRIPE_API_VERSION } from '../lib/stripe.js'
import { apiLogger } from '../lib/logger.js'

export interface DefaultCard {
  fingerprint: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface BillingJobStripeClient {
  /**
   * The customer's default-payment-method card, or null when there is no card
   * on file (no default set, non-card method, or a Stripe error the caller
   * should skip past rather than fail the whole task).
   */
  getDefaultCard(customerId: string): Promise<DefaultCard | null>
  /**
   * The live Stripe status of a subscription (e.g. 'active', 'past_due',
   * 'canceled'), or null when the subscription can't be resolved.
   */
  getSubscriptionStatus(subscriptionId: string): Promise<string | null>
}

let cachedClient: BillingJobStripeClient | null = null

/**
 * Lazy singleton over the real Stripe SDK, wrapped to the job's narrow needs.
 * Lazy so importing the job for tests never requires STRIPE_SECRET_KEY.
 */
export const getBillingJobStripeClient = (): BillingJobStripeClient => {
  if (cachedClient !== null) return cachedClient

  const secretKey = process.env['STRIPE_SECRET_KEY']
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  const stripe = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
  })

  cachedClient = {
    async getDefaultCard(customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId, {
          expand: ['invoice_settings.default_payment_method'],
        })
        if (customer.deleted) return null
        const defaultPm = customer.invoice_settings?.default_payment_method
        if (defaultPm === null || defaultPm === undefined) return null
        // Expanded → object; unexpanded → id string (fetch it).
        const paymentMethod =
          typeof defaultPm === 'string'
            ? await stripe.paymentMethods.retrieve(defaultPm)
            : defaultPm
        const card = paymentMethod.card
        if (
          card === null ||
          card === undefined ||
          card.fingerprint === null ||
          card.fingerprint === undefined
        ) {
          return null
        }
        return {
          fingerprint: card.fingerprint,
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        }
      } catch (err) {
        apiLogger.error(
          { err, customerId },
          'billing-daily-stripe: getDefaultCard failed — treating as no card',
        )
        return null
      }
    },
    async getSubscriptionStatus(subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        return subscription.status
      } catch (err) {
        apiLogger.error(
          { err, subscriptionId },
          'billing-daily-stripe: getSubscriptionStatus failed — returning null',
        )
        return null
      }
    },
  }
  return cachedClient
}
