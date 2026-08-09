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
  | 'logged-out-going'
  | 'logged-out-price'
  // A gated Follow tap on the artist page (#1115). Following is its own reach —
  // bucketing it with `logged-out-watch` would hide which of the two the
  // artist page actually converts on.
  | 'logged-out-follow'
  // A signed-in user committing their onboarding artist picks without the
  // entitlement to follow (PR 8). Deliberately NOT merged with
  // `logged-out-follow`: that one measures whether a follow tap earns an
  // account, this one whether it earns a subscription. Same button, different
  // question, and one bucket would answer neither.
  | 'follow'
  // A gated status report on the event page. Kept apart from
  // `logged-out-price` because reporting a cancellation and submitting a price
  // are different asks, and one bucket would hide which one earns accounts.
  | 'logged-out-report'
  // Reopened on the far side of sign-up, on the tier the visitor had picked
  // before they had an account (#1284). Its own bucket because it measures
  // whether carrying the choice across auth converts at all — folding it into
  // the reach that started the trip would hide exactly that.
  | 'post-signup'
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

/** Where a share sheet was opened from. One surface today; named so a second
 * one is a new member rather than an untyped string. */
export type ShareSurface = 'event-detail'

/**
 * The destinations the sheet actually offers. The keys are minted at the
 * `track` call-sites in `apps/web/.../share/ShareSheet.tsx` — `destinations.ts`
 * holds the capability helpers each one drives, not these identifiers.
 */
export type ShareDestination = 'system' | 'save-image' | 'copy-link'

/**
 * The poster shapes and themes a card can be drawn in.
 *
 * Mirrored rather than imported: the sources are `ShareRatio` in
 * `apps/web/.../share/definitions/ratios.ts` and `ThemeName` in
 * `apps/web/src/theme/themes.ts`, and this package cannot depend on the web app.
 * `analytics-events.contract.test.ts` in `apps/web` asserts both directions of
 * assignability, so adding a shape or a theme there without updating these
 * fails typecheck rather than silently emitting an unmodelled value.
 */
export type ShareCardRatio = 'story' | 'square' | 'link'

export type ShareCardTheme =
  | 'electric'
  | 'jade'
  | 'light'
  | 'pulse'
  | 'forge'
  | 'bluenote'
  | 'drip'
  | 'cedar'
  | 'gloss'

// Poster sharing (#72). Kept in its own map rather than folded into
// `MonetizationEventMap` because sharing is a Free-tier capability and does not
// belong to the paid funnel — merging them would make "the monetization events"
// a name that no longer describes its own contents.
export interface ShareEventMap {
  // `authed` distinguishes a share from a signed-in user from one taken on the
  // public mirror; no userId is attached here — the emitter already identifies.
  share_sheet_opened: {
    eventId: string
    surface: ShareSurface
    authed: boolean
  }
  share_destination_selected: { eventId: string; destination: ShareDestination }
  // `eventId` so a render joins back to the `share_sheet_opened` and
  // `share_destination_selected` rows for the same show — without it the render
  // count is a standalone total and the funnel cannot be walked end to end.
  share_card_rendered: {
    eventId: string
    ratio: ShareCardRatio
    theme: ShareCardTheme
    cacheHit: boolean
  }
  // `referrer` is the referring host only, never the full URL — a full referrer
  // can carry a query string belonging to somebody else's session.
  public_event_viewed: { eventId: string; referrer: string | null }
  // The Passport (#85). No `eventId` — the card is about the person, not a
  // show — and no `copy-link` destination, because it has no public URL.
  passport_shared: {
    destination: Extract<ShareDestination, 'system' | 'save-image'>
  }
}

export type ShareEvent = keyof ShareEventMap

/**
 * Every client-fireable event. The two maps stay separate above so each keeps a
 * name that describes it; call-sites and the `track` signature want the union.
 */
export interface AnalyticsEventMap
  extends MonetizationEventMap, ShareEventMap {}

export type AnalyticsEvent = keyof AnalyticsEventMap

export type AnalyticsEventProps<TEvent extends AnalyticsEvent> =
  AnalyticsEventMap[TEvent]

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
