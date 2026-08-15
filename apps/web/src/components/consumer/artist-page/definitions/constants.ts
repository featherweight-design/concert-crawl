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

/**
 * The band's height at the NARROW end: 16 top pad + a 44px back row + 12 gap +
 * the 128px panel + 18 bottom pad.
 *
 * It is a seed, not the truth. `HeroBand` steps its panel to 208 and grows its
 * padding at `sm` (640), while this page stays on its mobile layout until `md`
 * (768), so between those two widths the real band is far taller. The page
 * measures the rendered band and uses this only for SSR and the first paint,
 * before layout exists to be measured.
 */
export const AP_BAND_H = 218

/** Desktop rail slot, per the imagery handoff's slot table (#1525). */
export const AP_RAIL_W = 208

/** Below this width the page uses the narrow type ramp and padding. */
export const AP_NARROW_BP = 360

/**
 * Cancelled/postponed pill size on this page's show rows — a half-point below
 * the events card's 9px ramp step. Everything else about the pill is shared
 * with `components/consumer/StatusPill`, so a tone or label change lands on
 * both surfaces at once.
 */
export const AP_PILL_FONT_SIZE = 9.5

/** The mobile sticky sub-header's own height. */
export const AP_STICKY_BAR_H = 56

/**
 * How far the page scrolls before the sticky sub-header takes over: the band's
 * height less the bar's, so the bar arrives exactly as the band leaves and
 * never over the top of it.
 *
 * Seeded from `AP_BAND_H` and recomputed from the measured band once there is
 * one — the subtraction is the rule, the 218 is only its opening guess.
 */
export const AP_STICKY_AFTER = AP_BAND_H - AP_STICKY_BAR_H

/** Spotify embed heights (consumed by PR-F). */
export const EMBED_H = { compact: 152, tall: 352 } as const

/**
 * Follow-button geometry, verbatim from the native-following handoff
 * (`nf-shared.jsx` NF_FOLLOW_SIZES). One table so every follow affordance in
 * the app — artist page, search rows, the bill block — is the same control at
 * three densities rather than three lookalikes.
 *
 * `sm` (36) is below the 44px touch minimum and is permitted ONLY where the
 * containing row is itself the target, or where there is no touch — which is
 * why nothing on the artist page uses it: this page's buttons are the target.
 * Two consumers. The search-results artist row, which is a ≥56px target in its
 * own right; and the desktop card on My shows ▸ Artists, a mouse surface. That
 * page's MOBILE row takes `md` instead, because its name is a link to the
 * artist page, leaving the button as the only place unfollow can be tapped.
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
