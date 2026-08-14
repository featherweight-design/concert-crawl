// apps/api/src/emails/types.ts
//
// Template module contract (eng infra spec Part 2 §4.2) + the per-template
// vars shapes derived from the #783 design brief's variable lists.

import type { EmailTemplateKey } from '@concert-crawl/db'

export interface RenderedEmail {
  subject: string
  preheader: string
  html: string
  text: string
}

export type TemplateRenderer<Vars> = (vars: Vars) => RenderedEmail

// Paid tiers that can carry a billing relationship (drive the receipt/card
// tier badge + accent). Gifted is comped and never receives these emails.
export type PaidEmailTier = 'premium' | 'supporter' | 'founder'

// Receipt vars are identical for monthly and annual — the period discriminator
// lives in the template key, and the shared receipt core reads it. `tier` is
// optional: absent falls back to a premium badge/accent.
interface ReceiptVars {
  periodLabel: string
  amount: string | null
  tierName: string | null
  periodEnd: string | null
  chargeDate: string
  customerId: string
  stripeReceiptUrl: string | null
  tier?: PaidEmailTier
}

// Nullable fields are vars a trigger cannot always derive (e.g. a webhook
// payload missing the receipt URL) — templates own the fallback copy.
export interface EmailTemplateVars {
  welcome_paid: {
    tier: 'premium' | 'supporter' | 'founder'
    founderSeatNumber?: number
  }
  welcome_gifted: {
    gifterName: string | null
    giftEndsAt: string | null
    // Same contract as the digest: the caller builds the signed URL and passes
    // null when EMAIL_UNSUBSCRIBE_SECRET is unset, so the footer falls back to
    // the settings link rather than rendering a link that cannot verify.
    unsubscribeUrl: string | null
  }
  renewal_receipt_monthly: ReceiptVars
  renewal_receipt_annual: ReceiptVars
  dunning_1_card_declined: {
    tierName: string | null
    portalUrl: string
  }
  dunning_2_still_declined: {
    tierName: string | null
    portalUrl: string
  }
  dunning_3_final_warning: {
    tierName: string | null
    portalUrl: string
  }
  card_expiring_soon: {
    tierName: string | null
    daysRemaining: number
    tier?: PaidEmailTier
    // The card on file, when the trigger could resolve it from Stripe. Absent →
    // the template omits the card chip rather than showing a placeholder.
    card?: {
      brand: string
      last4: string
      expMonth: number
      expYear: number
    } | null
  }
  cancellation_ack: {
    tierName: string | null
    accessEndsAt: string | null
  }
  // The product-family templates carry a signed one-click opt-out (#967),
  // same contract as the digest: null when EMAIL_UNSUBSCRIBE_SECRET is unset,
  // and the footer falls back to the Settings link. welcome_gifted declares
  // the same var above, so the whole family is consistent.
  gifting_ending_notice: {
    gifterName: string | null
    giftEndsAt: string
    unsubscribeUrl: string | null
  }
  winback: {
    tierName: string | null
    unsubscribeUrl: string | null
  }
  spotify_digest: {
    // All of the week's matched shows — the template features the first 5 and
    // collapses the rest into "+N more this week". Empty = zero-week variant.
    shows: DigestEmailShow[]
    // Up to 2 taste-based picks shown ONLY on zero weeks (design lock: the
    // email always earns its open).
    tastePicks: DigestEmailShow[]
    // Signed one-click opt-out (#763 §8.2). Null when EMAIL_UNSUBSCRIBE_SECRET
    // is unset — the footer then falls back to the Settings link.
    unsubscribeUrl: string | null
  }
}

// One digest show row (#763 spec §8.2, design mock digest-email.jsx). Labels
// arrive pre-formatted — the job owns Denver-timezone date and price display.
export interface DigestEmailShow {
  artist: string
  tourName: string | null
  venue: string
  dateLabel: string
  priceLabel: string | null
  url: string
}

// Distributive union keeping templateKey ↔ vars correlated, so a queued send
// can be stored heterogeneously (webhook post-commit queue) without casts.
export type TransactionalEmailParams = {
  [K in EmailTemplateKey]: {
    templateKey: K
    userId: string
    dedupeKey: string
    vars: EmailTemplateVars[K]
  }
}[EmailTemplateKey]
