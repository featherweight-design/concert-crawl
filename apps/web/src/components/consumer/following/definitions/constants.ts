// Non-copy constants for the browse follow shelf (native following, PR 4).

// The card box itself (width and height) lives in
// consumer/definitions/constants.ts, because the Spotify taste shelf and its
// skeleton share it. The earlier 138/124 narrow split is gone with it.

/**
 * The 320px baseline. The shelf card no longer switches on it — its width is
 * flat now — but My shows ▸ Artists still does, dropping its row artwork and
 * its unfollow label to an icon there.
 */
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
 * the same ten artists on the shelf for weeks.
 */
export const SHELF_SHUFFLE_SEED_KEY = 'cc.following.shelfSeed'
