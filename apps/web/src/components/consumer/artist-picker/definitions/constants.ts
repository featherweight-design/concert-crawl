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

/**
 * Which picks came from SEARCH rather than from the suggestion grid.
 *
 * The shell prunes the selection to what the grid currently shows, because a
 * pick with no tile left has no way to be unticked. A search pick has no tile
 * by definition, so without this it is silently dropped the moment the
 * suggestions land — on first load, after a retry, or when the genres change.
 *
 * Mirrored rather than held in state alone for the same reason the picks are:
 * a redirect-based payment method unmounts this tree and comes back.
 */
export const SEARCH_PICKS_KEY = 'cc.onboarding.searchPicks'

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

/**
 * The field debounce, matched to the one `/search` uses so the tour's field
 * feels like the app's field rather than a second search with its own rhythm.
 */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * Below this the endpoint 400s, so asking is a wasted round trip and a
 * misleading "nobody by that name". Same floor the route validates against.
 */
export const SEARCH_MIN_QUERY = 2

/**
 * Skeleton rows while a query is in flight — a count, not a spinner, so the
 * body keeps its height and the rail below does not walk up the screen.
 *
 * THREE, matching `ARTIST_RESULT_LIMIT` on `/v1/search/artists`. At four, every
 * successful query replaced four skeletons with at most three rows and the body
 * contracted by a row's height — the exact jump this constant exists to
 * prevent, caused by the constant itself.
 */
export const SEARCH_SKELETON_COUNT = 3

/** Faces in the picked strip before it stops drawing them and counts instead. */
export const PICKED_STRIP_FACES = 6
