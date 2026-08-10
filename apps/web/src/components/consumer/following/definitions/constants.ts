// Non-copy constants for the browse follow shelf (native following, PR 4).

/**
 * Card width, in px. The same 168 the Spotify taste shelf has always used, and
 * flat across viewports for the same reason it is there: the two shelves
 * occupy one slot on browse and a viewport-dependent width made the native one
 * disagree with its own loading skeleton. The earlier 138/124 narrow split is
 * gone with it — 168 already renders at the 320px baseline.
 */
export const SHELF_CARD_WIDTH = 168

/** Media query the narrow width switches on. */
export const SHELF_NARROW_QUERY = '(max-width: 359px)'

/**
 * Starter-shelf pool size. Larger than the ten the shelf shows so the
 * per-session shuffle has something to choose between — a shuffle over exactly
 * as many artists as fit on screen is a reorder, not a rotation.
 */
export const SHELF_SUGGESTION_POOL = 24

/** Cards rendered from that pool. Matches the Spotify taste shelf's ten. */
export const SHELF_VISIBLE_CARDS = 10

/**
 * Where the per-session shuffle seed lives. sessionStorage, not local: "per
 * session" is the spec's word, and a seed that outlived the tab would freeze
 * the same six artists on the shelf for weeks.
 */
export const SHELF_SHUFFLE_SEED_KEY = 'cc.following.shelfSeed'
