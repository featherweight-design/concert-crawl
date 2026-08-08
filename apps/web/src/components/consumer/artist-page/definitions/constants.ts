// Artist page (#1115) tuning values. These are DATA, not copy — nothing in
// here is customer-facing prose.

/**
 * The start of the crawl window. Interpolated into every history string, so a
 * licensed backfill changes this one value and no copy is touched.
 */
export const CRAWL_SINCE = 'March 2026'

/** Minimum nights at one venue before a cluster earns the word "run". */
export const RESIDENCY_MIN = 3

/**
 * Doing double duty, deliberately: the maximum gap BETWEEN two nights before a
 * new cluster is cut, and the maximum total span of a cluster that calls
 * itself a run. Gap alone would let three nights 21 days apart read as a
 * "3-night run" across six weeks, which is a tour, not a residency.
 */
export const RESIDENCY_WINDOW = 21

/**
 * How many upcoming ITEMS render before the show-all control appears. A run is
 * one item; the section-head count and the show-all label both count SHOWS.
 */
export const SHOWS_VISIBLE = 5

/** Hero plate height, by viewport width against AP_NARROW_BP. */
export const AP_HERO_H = { wide: 200, narrow: 150 } as const

/** Below this width the page uses the narrow type ramp and padding. */
export const AP_NARROW_BP = 360

/**
 * Cancelled/postponed pill size on this page's show rows — a half-point below
 * the events card's 9px ramp step. Everything else about the pill is shared
 * with `components/consumer/StatusPill`, so a tone or label change lands on
 * both surfaces at once.
 */
export const AP_PILL_FONT_SIZE = 9.5

/**
 * How far the page scrolls before the mobile sticky sub-header takes over. The
 * hero is 200px tall and the bar is 56px, so the bar arrives exactly as the
 * plate leaves — never over the top of it.
 */
export const AP_STICKY_AFTER = AP_HERO_H.wide - 56

/**
 * Where the monogram chip sits above the bottom of the MOBILE hero plate.
 *
 * `.ap-shell` is tucked up over the plate by 26px so the name overlaps the
 * artwork, which put the chip's default 12px offset underneath the plate's
 * visible edge and straight through the first letter of the `<h1>`. 12 + the
 * 26px tuck restores the designed gap without giving up the tuck. Desktop is
 * unaffected — its plate is a separate grid column — so this offset is passed
 * only by the mobile instance.
 */
export const AP_MONOGRAM_BOTTOM = 38

/** Spotify embed heights (consumed by PR-F). */
export const EMBED_H = { compact: 152, tall: 352 } as const

/**
 * Follow-button geometry, verbatim from the native-following handoff
 * (`nf-shared.jsx` NF_FOLLOW_SIZES). One table so every follow affordance in
 * the app — artist page, search rows, the bill block — is the same control at
 * three densities rather than three lookalikes.
 *
 * `sm` (36) is below the 44px touch minimum and is permitted ONLY where the
 * row containing it is itself the target, which is why nothing on the artist
 * page uses it: this page's buttons are the target. Nothing consumes it yet —
 * the search-results row (PR 5 of this epic) is what it is sized for.
 *
 * `full` carries padding even though it renders at `width: 100%` — the padding
 * insets the label rather than sizing the control, and keeping it here means
 * an icon-only `full` (no width override) still matches the handoff.
 */
export const NF_FOLLOW_SIZES = {
  sm: { height: 36, padding: '0 12px', fontSize: 12.5, gap: 6, glyph: 12 },
  md: { height: 44, padding: '0 14px', fontSize: 13.5, gap: 7, glyph: 13 },
  full: { height: 48, padding: '0 18px', fontSize: 15, gap: 7, glyph: 13 },
} as const
