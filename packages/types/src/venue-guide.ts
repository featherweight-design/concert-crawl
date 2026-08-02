// #764 Venue first-timer guide — the shared pure module.
//
// Everything here is imported by BOTH apps/api (validation + serialization)
// and apps/web (admin badge + consumer branch), so the two can never drift.
// There is exactly one implementation of each predicate in the repo.

/**
 * The authorable chip pool, in display order. `accessibility` is pinned first
 * and is the only chip the publish gate requires (brief Q4).
 *
 * These are the canonical keys used in the DB column, the Zod enum, the TS
 * union, the copy label map and the admin placeholder map. The design
 * prototype's short keys (`age`, `bag`, `coat`, `entry`, `food`) were
 * display-only in the canvas — there is deliberately NO mapping layer.
 */
export const GUIDE_CHIP_ORDER = [
  'accessibility',
  'parking',
  'age_policy',
  'bag_check',
  'coat_check',
  'will_call',
  'food_drink',
  'transit',
] as const

export type GuideChipKey = (typeof GUIDE_CHIP_ORDER)[number]

/**
 * Reserved for #997. Rendered as disabled ghosts in the admin picker and
 * rejected by `isGuideChipKey`. Because `venue_guide_chips.chip_type` is a
 * text column, promoting one of these is a pure application-code change —
 * no migration, no ALTER TYPE.
 */
export const GUIDE_CHIP_V2_KEYS = [
  'weather',
  'restrooms',
  'atm',
  'cell_service',
] as const

export type GuideChipV2Key = (typeof GUIDE_CHIP_V2_KEYS)[number]

/** Real type predicate over the const tuple — no casts, no lookup object. */
export const isGuideChipKey = (value: string): value is GuideChipKey =>
  GUIDE_CHIP_ORDER.some((key) => key === value)

/** One persisted chip. `blank` is absence — never a row. */
export interface VenueGuideChip {
  chipType: GuideChipKey
  body: string
  isPlaceholder: boolean
}

export type GuideChipState = 'blank' | 'authored' | 'honest_placeholder'

/**
 * `undefined` (no row) and a whitespace-only body are both `blank`.
 * `isPlaceholder` wins over any body — the honest placeholder renders its own
 * copy, so a leftover draft body must never leak into the display state.
 */
export const deriveChipState = (
  input: { body: string; isPlaceholder: boolean } | undefined,
): GuideChipState => {
  if (input === undefined) return 'blank'
  if (input.isPlaceholder) return 'honest_placeholder'
  return input.body.trim().length > 0 ? 'authored' : 'blank'
}

export type GuidePublishState =
  | { kind: 'ready' }
  | { kind: 'ready_with_placeholder' }
  | { kind: 'blocked'; reason: 'accessibility_required' }

/**
 * The publish gate. Never persisted — the admin badge and the server-side
 * publish handler both call this, so the client cannot show "Ready" for
 * something the server will reject.
 */
export const deriveGuidePublishState = (input: {
  accessibilityBody: string
  accessibilityPlaceholder: boolean
}): GuidePublishState => {
  if (input.accessibilityPlaceholder) return { kind: 'ready_with_placeholder' }
  if (input.accessibilityBody.trim().length > 0) return { kind: 'ready' }
  return { kind: 'blocked', reason: 'accessibility_required' }
}

export type GuideViewerMode = 'first_timer' | 'returner'

/**
 * `hasAttendedVenue === null` means "detection not wired yet" (pre-#70).
 *
 * We default to HELPFUL when we don't know someone's history (brief Q7), so
 * unknown resolves to `first_timer`, never `returner`. Only a signed-in
 * viewer we positively know has attended gets the collapsed returner state.
 */
export const resolveGuideViewerMode = (input: {
  isSignedIn: boolean
  hasAttendedVenue: boolean | null
}): GuideViewerMode =>
  input.isSignedIn && input.hasAttendedVenue === true
    ? 'returner'
    : 'first_timer'

export type GuideDensity = 'populated' | 'thin'

/** `thin` === accessibility is the only chip AND there is no insider tip. */
export const deriveGuideDensity = (input: {
  chips: VenueGuideChip[]
  insiderTip: string | null
}): GuideDensity => {
  const hasInsiderTip = (input.insiderTip ?? '').trim().length > 0
  if (hasInsiderTip) return 'populated'
  const nonAccessibilityChips = input.chips.filter(
    (chip) => chip.chipType !== 'accessibility',
  )
  return nonAccessibilityChips.length > 0 ? 'populated' : 'thin'
}

export interface VenueGuide {
  /** Ordered by GUIDE_CHIP_ORDER — accessibility first. */
  chips: VenueGuideChip[]
  insiderTip: string | null
  /**
   * ISO 8601, or null for a guide that has never been published.
   *
   * Nullable because the same shape serves the admin draft read, where an
   * unpublished guide is the normal case. The consumer endpoint never returns
   * an unpublished guide at all — it serves `VenuePublic.guide: null` — so a
   * non-null value there is an invariant of that route, not of this type.
   */
  publishedAt: string | null
}
