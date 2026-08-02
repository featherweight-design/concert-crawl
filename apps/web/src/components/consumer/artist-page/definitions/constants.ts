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

/** Spotify embed heights (consumed by PR-F). */
export const EMBED_H = { compact: 152, tall: 352 } as const
