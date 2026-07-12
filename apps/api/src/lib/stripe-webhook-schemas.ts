// apps/api/src/lib/stripe-webhook-schemas.ts
//
// Zod schemas for the slices of Stripe webhook payloads the handlers consume
// (eng infra spec Part 2 §1.5). Stripe objects cross a system boundary, so
// every field is safeParse'd — no structural trust, no casts.

import { z } from 'zod'

// Stripe sometimes delivers related objects as bare IDs and sometimes as
// expanded objects — normalize both to the ID string.
const stripeIdSchema = z
  .union([z.string(), z.object({ id: z.string() })])
  .transform((value) => (typeof value === 'string' ? value : value.id))

const metadataSchema = z.record(z.string()).nullish()

// Subscription items carry the price + period bounds. Under API version
// 2026-06-24.dahlia the current_period_* fields live on the item (moved off
// the subscription in the 2025 basil release).
const subscriptionItemSchema = z.object({
  // The subscription item ID (`si_…`) — required by the change-tier price
  // switch (subscriptions.update items[].id); nullish because webhook test
  // fixtures and older payload slices may omit it.
  id: z.string().nullish(),
  price: z.object({
    id: z.string(),
    lookup_key: z.string().nullish(),
  }),
  current_period_start: z.number().nullish(),
  current_period_end: z.number().nullish(),
})

export const stripeSubscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  customer: stripeIdSchema,
  cancel_at_period_end: z.boolean().nullish(),
  metadata: metadataSchema,
  items: z.object({ data: z.array(subscriptionItemSchema) }).nullish(),
})

export type StripeSubscriptionSnapshot = z.infer<
  typeof stripeSubscriptionSchema
>

// Invoice slice. `parent.subscription_details` is the dahlia-era home of the
// subscription pointer; the legacy top-level `subscription` field is kept as
// a fallback for older payload shapes.
export const stripeInvoiceSchema = z.object({
  id: z.string().nullish(),
  customer: stripeIdSchema.nullish(),
  billing_reason: z.string().nullish(),
  attempt_count: z.number().nullish(),
  subscription: stripeIdSchema.nullish(),
  parent: z
    .object({
      subscription_details: z
        .object({
          subscription: stripeIdSchema.nullish(),
          metadata: metadataSchema,
        })
        .nullish(),
    })
    .nullish(),
})

export type StripeInvoiceSnapshot = z.infer<typeof stripeInvoiceSchema>

export const stripePaymentIntentSchema = z.object({
  id: z.string(),
  customer: stripeIdSchema.nullish(),
  last_payment_error: z
    .object({
      type: z.string().nullish(),
      code: z.string().nullish(),
      decline_code: z.string().nullish(),
    })
    .nullish(),
})

export type StripePaymentIntentSnapshot = z.infer<
  typeof stripePaymentIntentSchema
>

/** The subscription ID an invoice belongs to, across payload shapes. */
export const resolveInvoiceSubscriptionId = (
  invoice: StripeInvoiceSnapshot,
): string | null =>
  invoice.parent?.subscription_details?.subscription ??
  invoice.subscription ??
  null

/** Epoch-seconds → Date; null-safe (Stripe timestamps are epoch seconds). */
export const epochSecondsToDate = (
  seconds: number | null | undefined,
): Date | null =>
  typeof seconds === 'number' ? new Date(seconds * 1000) : null
