/**
 * The standalone search page, and `SearchLink`'s no-JS fallback.
 *
 * It is also where every "find more artists" affordance points: there is no
 * `/artists` index route, and `/following` is deliberately not under
 * `/artists/...` because middleware lists `/artists(.*)` as public-once-launched.
 */
export const SEARCH_HREF = '/search'
