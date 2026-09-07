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
 * Follow-button geometry, from the R3 scale-and-weight handoff. One table so
 * every follow affordance in the app — artist page, search rows, the bill
 * block, the shelf badge — is the same control at four densities rather than
 * four lookalikes.
 *
 * The keys name PLACEMENT, not density, because placement is what the rule
 * actually constrains: one filled Follow per screen, and it belongs to
 * `primary`. Everywhere else is quiet, and quiet is the default.
 *
 * Every height below 44 is a VISUAL height. `FollowButton` grows a transparent
 * overlay symmetrically on both axes so the tap target stays 44px (WCAG
 * 2.5.8), which is why a row control can be 28 tall without asking anything of
 * the row it sits in.
 *
 * `badge` carries no label — `fontSize: 0` is deliberate, and the control
 * squares off against its own height before `radius` rounds it to a circle.
 *
 * `radius` rises with the control: the rows share 8, and only `primary` takes
 * 10, so the one filled button on a screen reads slightly softer than the quiet
 * ones around it rather than identical-but-bigger.
 */
/** The tap target every follow control grows to, however small it draws. */
export const NF_TAP_MIN = 44

export const NF_FOLLOW_SIZES = {
  badge: {
    height: 26,
    padding: '0',
    fontSize: 0,
    gap: 0,
    glyph: 12,
    radius: 999,
  },
  row: {
    height: 28,
    padding: '0 10px',
    fontSize: 12,
    gap: 6,
    glyph: 11,
    radius: 8,
  },
  rowWide: {
    height: 32,
    padding: '0 12px',
    fontSize: 12.5,
    gap: 6,
    glyph: 11,
    radius: 8,
  },
  primary: {
    height: 44,
    padding: '0 18px',
    fontSize: 14.5,
    gap: 7,
    glyph: 14,
    radius: 10,
  },
} as const
