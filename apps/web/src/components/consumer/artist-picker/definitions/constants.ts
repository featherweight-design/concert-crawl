// Multi-select artist picker (native following, PR 8).

/**
 * sessionStorage mirror of the onboarding selection, namespaced like every
 * other key we own (`cc.following.shelfSeed` is the precedent).
 *
 * It exists for ONE reason: committing the picks is entitlement-gated, and the
 * upgrade path unmounts this tree (embedded checkout, and on some routes a
 * full navigation). Without the mirror an unpaid visitor who chose to upgrade
 * would come back to an empty grid, which is exactly the moment we told them
 * "nothing gets lost". `session`, not `local`: a selection is a thing you are
 * in the middle of, not a preference.
 */
export const ARTIST_PICKS_KEY = 'cc.onboarding.artistPicks'

/** Same mirror, for the genre step that feeds the suggestions query. */
export const GENRE_PICKS_KEY = 'cc.onboarding.genrePicks'

// Mobile is ALWAYS two-up, 320 through the desktop breakpoint — never one, or
// a 320px screen shows two artists and a scroll. Desktop's card is wide enough
// for five.
export const PICK_COLUMNS_MOBILE = 2
export const PICK_COLUMNS_DESKTOP = 5

/**
 * How many suggestions the step asks for. Matches the API's default, so the
 * grid fills five desktop columns evenly and lands on six mobile rows.
 */
export const PICK_SUGGESTION_LIMIT = 12

/** Placeholder tiles while the suggestions land, so the grid never flashes empty. */
export const PICK_SKELETON_COUNT = 6
