import type { TierKey } from '@/components/consumer/tier-picker/definitions/types'

/** What tapping a Plan card CTA does (PR 3.4 scope + PR 4.5 lifecycle). */
export type PlanCardAction =
  | 'portal' // POST /v1/billing/portal-session → Stripe portal (paid plans only)
  | 'tier-picker' // open the #781 tier picker (upgrade path for free users)
  | 'manage-sheet' // open the #780 in-app manage-subscription sheet (PR 4.5)
  | 'resubscribe' // one-tap POST /v1/billing/resubscribe (cancel-grace only)

export interface PlanCardCta {
  label: string
  kind: 'primary' | 'ghost'
  action: PlanCardAction
  /** Emphasized primary buttons carry the #780 glow treatment. */
  glow?: boolean
  /** Portal-bound CTAs marked in the design with the ↗ arrow (#782). */
  portalArrow?: boolean
}

/** Card accent tone → CSS variable. `warning` is the #782 past-due tone. */
export type PlanCardTone = 'signal' | 'accent' | 'warning' | 'muted'

/** The #780 inline status rail (trial countdown / winding-down / dunning). */
export interface PlanCardRail {
  tone: 'signal' | 'warning' | 'muted'
  label: string
  sub?: string
}

export type PlanCardVariant =
  | 'past-due'
  | 'gifted'
  | 'trial-early'
  | 'trial-ends-tomorrow'
  | 'trial-ends-today'
  | 'cancel-grace'
  | 'active-supporter'
  | 'active-premium'
  | 'active-founder'
  | 'free'
  | 'free-post-trial'
  | 'free-post-cancel'

/** Fully-resolved Plan card view model — copy, tone, and CTA wiring. */
export interface PlanCardContent {
  variant: PlanCardVariant
  tone: PlanCardTone
  /** TierBadge tier; null renders the mono "Free" chip instead. */
  badgeTier: TierKey | null
  /** Gifted cards show the Beta chip next to the Premium badge (#781 §4). */
  betaChip: boolean
  /** Context chip (TRIAL / PAYMENT FAILED / WINDING DOWN / …); null = none. */
  chip: string | null
  /** Winding-down chips render muted rather than accent-toned. */
  chipMuted: boolean
  eyebrow: string
  headline: string
  body: string
  punchline: string
  rail: PlanCardRail | null
  ctas: PlanCardCta[]
  /** Emphasis top rail + stronger border (trial day 13/14 treatment). */
  emphasis: boolean
  /** Founder cards get the signal→accent gradient primary button. */
  founderGradient: boolean
}
