// Non-copy constants for the browse follow shelf (native following, PR 4).

/**
 * Card edge, in px. 124 under 360px so three cards still peek at the 320px
 * baseline; 138 above it (nf-cold-start.jsx `narrow` split).
 */
export const SHELF_CARD_WIDTH_NARROW = 124
export const SHELF_CARD_WIDTH = 138

/** Media query the narrow width switches on. */
export const SHELF_NARROW_QUERY = '(max-width: 359px)'

/**
 * Starter-shelf pool size. Larger than the six the shelf shows so the
 * per-session shuffle has something to choose between — a shuffle over exactly
 * as many artists as fit on screen is a reorder, not a rotation.
 */
export const SHELF_SUGGESTION_POOL = 18

/** Cards rendered from that pool. */
export const SHELF_VISIBLE_CARDS = 6

/**
 * Where the per-session shuffle seed lives. sessionStorage, not local: "per
 * session" is the spec's word, and a seed that outlived the tab would freeze
 * the same six artists on the shelf for weeks.
 */
export const SHELF_SHUFFLE_SEED_KEY = 'cc.following.shelfSeed'
