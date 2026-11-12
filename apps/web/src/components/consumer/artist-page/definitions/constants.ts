// Artist page (#1115) tuning values. These are DATA, not copy — nothing in
// here is customer-facing prose.

import { recordsStartLabel } from '@concert-crawl/types';

/**
 * The start of the crawl window. Interpolated into every history string, so a
 * licensed backfill changes this one value and no copy is touched.
 */
export const CRAWL_SINCE = recordsStartLabel();

/** Minimum nights at one venue before a cluster earns the word "run". */
export const RESIDENCY_MIN = 3;

/**
 * Doing double duty, deliberately: the maximum gap BETWEEN two nights before a
 * new cluster is cut, and the maximum total span of a cluster that calls
 * itself a run. Gap alone would let three nights 21 days apart read as a
 * "3-night run" across six weeks, which is a tour, not a residency.
 */
export const RESIDENCY_WINDOW = 21;

/**
 * How many upcoming ITEMS render before the show-all control appears. A run is
 * one item; the section-head count and the show-all label both count SHOWS.
 */
export const SHOWS_VISIBLE = 5;

/**
 * The mobile stage's height at the narrow end (B+ `09-artist`): 16 top pad +
 * 32 above the card + the 250px card (200 wide at 4:5) + 24 + the eyebrow,
 * a one-line name and the genre chips (~96) + 24 bottom pad.
 *
 * It is a seed, not the truth. A long name wraps and an ungenred artist has no
 * chips, so the page measures the rendered stage and uses this only for SSR
 * and the first paint, before layout exists to be measured.
 */
export const AP_BAND_H = 442;

/** Below this width the page uses the narrow type ramp and padding. */
export const AP_NARROW_BP = 360;

/**
 * Cancelled/postponed pill size on this page's show rows — a half-point below
 * the events card's 9px ramp step. Everything else about the pill is shared
 * with `components/consumer/StatusPill`, so a tone or label change lands on
 * both surfaces at once.
 */
export const AP_PILL_FONT_SIZE = 9.5;

/** The mobile sticky sub-header's own height. */
export const AP_STICKY_BAR_H = 56;

/**
 * How far the page scrolls before the sticky sub-header takes over: the band's
 * height less the bar's, so the bar arrives exactly as the band leaves and
 * never over the top of it.
 *
 * Seeded from `AP_BAND_H` and recomputed from the measured band once there is
 * one — the subtraction is the rule, the 218 is only its opening guess.
 */
export const AP_STICKY_AFTER = AP_BAND_H - AP_STICKY_BAR_H;

/**
 * The venue icon beside the venue's name on every Upcoming item (B+
 * `09-artist`: "Upcoming comes first, with venue icons"): a single row and a
 * run's header share it, so the two never drift apart.
 */
export const AP_VENUE_TILE = 22;

/**
 * The Spotify ARTIST embed's height: three whole tracks. Measured for the
 * artist embed only; another embed type has its own layout and needs its own
 * measurement.
 *
 * Measured inside the embed (2026-11-12, Playwright). Iframe widths are the
 * viewport less the shell gutters and the mat (6px padding + 1.5px border a
 * side): 277 at a 320 viewport (14px gutters), 343 at 390 (16px), 385 at 1300
 * (the 400px side column).
 * - Below 352 tall Spotify keeps its 152 layout, whose track list is a fixed
 *   81px scroller of 23px rows, so a fourth row is always cut in half.
 * - From 352 it switches to the list layout, identical at all three widths:
 *   rows at 208-260, 260-311, 311-362, and the list runs to the frame's
 *   bottom edge. At 352 the third row is cut 10px short.
 * - 362 ends the frame on the third row's bottom edge at 277, 343 and 385.
 */
export const ARTIST_EMBED_H = 362;

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
export const NF_TAP_MIN = 44;

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
} as const;
