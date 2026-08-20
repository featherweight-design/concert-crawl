import type { DeclineCategory, UserPlan } from '@concert-crawl/types'

/** The four purchasable/renderable tiers in the picker. */
export type TierKey = 'free' | 'supporter' | 'premium' | 'founder'

/**
 * Picker state vocabulary — the six design-handoff states (R5/R6) plus
 * 'trial'. A trial user derives plan 'premium' but has no Stripe customer,
 * so they must never be offered the portal; they get acquisition CTAs with
 * Premium framed as "keep", not "start".
 */
export type PickerState = Exclude<UserPlan, 'gifted'> | 'gifted' | 'trial'

export interface TierFeature {
  text: string
  /** "More coming ★" rows render dimmed with a star glyph. */
  future?: boolean
}

export interface TierDefinition {
  key: TierKey
  name: string
  priceText: string
  priceUnit: string
  tagline: string
  rationale: string
  features: TierFeature[]
  /** Mono aside rendered under the feature list. Supporter only today. */
  monoNote?: string
  /** Paid-tier price-promise microcopy (#782). Founder carries its own bullet. */
  pricePromise?: string
}

export type CtaTone =
  'signal' | 'founder' | 'ghost-accent' | 'ghost' | 'current'

/** What tapping a CTA does. Flows not shipped yet render disabled. */
export type CtaAction =
  | 'checkout' // POST /v1/billing/checkout-session → embedded Payment Element
  | 'manage' // POST /v1/billing/portal-session → Stripe portal
  | 'sign-up' // route to /sign-up (logged-out)
  | 'none' // disabled (current Free, founder-covers-premium, PR 4.5 flows)

export interface TierCta {
  label: string
  tone: CtaTone
  action: CtaAction
  disabled: boolean
}

/** 3DS vs. SCA framing for the challenge mount (design table PR 4.4). */
export type ChallengeKind = '3ds' | 'sca'

/**
 * Which layout the checkout flow is showing. The Stripe Elements provider
 * stays mounted across all three — only the surrounding chrome changes.
 */
export type CheckoutSurface =
  | { kind: 'checkout' }
  | { kind: 'failure'; category: DeclineCategory }
  | { kind: 'challenge'; challenge: ChallengeKind }

/** Scarcity-rail view model derived from the founder-window endpoint. */
export interface ScarcityRailData {
  seatsClaimed: number
  seatsTotal: number
  seatsLeft: number
  daysLeft: number
  hoursLeft: number
  hot: boolean
}
