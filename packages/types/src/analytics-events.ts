// Monetization funnel analytics contract (eng-infra spec Part 2 §8).
//
// Shared by web (posthog-js) and API (posthog-node) so both sides agree on
// event names and property shapes. The distinct ID is always the Clerk
// userId, so client-fired and server-fired events join into one funnel.
//
// This module is mostly types. It pulls UserPlan/FounderWindowState back from
// index.ts, so those are `import type` — type-only imports are erased at
// compile time and never create a runtime circular dependency. The one runtime
// export — `asCheckoutTier` — is pulled in by callers with a value import.

import type { DeclineCategory } from './decline-category.js'
import type { UserPlan, FounderWindowState } from './index.js'

// The three paid tiers a checkout can target. Narrower than UserPlan: the
// non-purchasable states ('logged-out', 'free', 'gifted') can never be a
// checkout target.
export type CheckoutTier = 'supporter' | 'premium' | 'founder'

// How a paid surface was reached. Renewals are intentionally NOT a flow —
// they are not part of the acquisition/conversion funnel and are skipped.
export type PaymentFlow = 'new' | 'trial-conversion' | 'upgrade'

// Where the tier picker was opened from (spec §8 `entry` property).
// `logged-out-watch` is distinct from `logged-out-paywall` on purpose: a gated
// Watch tap and a gated taste-filter tap are the two halves of the launch's
// most important funnel, and one shared bucket makes them unmeasurable.
export type PickerEntry =
  | 'settings'
  | 'paywall'
  | 'logged-out-paywall'
  | 'logged-out-watch'
  | 'takeover'

// Per-event property shapes. Keys are the canonical event names; the map is
// the single source of truth for both `MonetizationEvent` (the name union)
// and `MonetizationEventProps` (name → props lookup).
export interface MonetizationEventMap {
  monetization_picker_viewed: { entry: PickerEntry; plan: UserPlan }
  monetization_tier_selected: { tier: CheckoutTier; plan: UserPlan }
  payment_surface_opened: { tier: CheckoutTier; flow: PaymentFlow }
  // Emitted by both web (client-side decline) and API (webhook
  // payment_intent.payment_failed). The server may not know the tier, so it
  // is nullable.
  payment_failed: {
    tier: CheckoutTier | null
    declineCategory: DeclineCategory
  }
  payment_succeeded: {
    tier: CheckoutTier
    amountCents: number
    flow: PaymentFlow
  }
  trial_ended_takeover_shown: Record<string, never>
  // Fired web-side when the user confirms cancellation. The browser does not
  // know the subscription start date, so daysSubscribed is null here — the
  // server-truth cancel_completed carries the computed duration.
  cancel_initiated: { tier: CheckoutTier; daysSubscribed: number | null }
  cancel_completed: { tier: CheckoutTier; daysSubscribed: number }
  founder_window_view: { state: FounderWindowState }
  founder_claim_attempted: Record<string, never>
  founder_claim_succeeded: { seatNumber: number }
  founder_claim_raced_out: Record<string, never>
}

export type MonetizationEvent = keyof MonetizationEventMap

export type MonetizationEventProps<TEvent extends MonetizationEvent> =
  MonetizationEventMap[TEvent]

const CHECKOUT_TIERS: readonly CheckoutTier[] = [
  'supporter',
  'premium',
  'founder',
]

// Narrow an arbitrary string (a plan, a mirrored DB tier) to a CheckoutTier,
// returning null when it is not a purchasable tier. Server call-sites resolve
// the tier from the subscription mirror where it may be 'free' or absent.
export const asCheckoutTier = (
  value: string | null | undefined,
): CheckoutTier | null => CHECKOUT_TIERS.find((tier) => tier === value) ?? null
