/**
 * The standalone search page, and `SearchLink`'s no-JS fallback.
 *
 * It is also where every "find more artists" affordance points: there is no
 * `/artists` index route, and `/following` is deliberately not under
 * `/artists/...` because middleware lists `/artists(.*)` as public-once-launched.
 */
export const SEARCH_HREF = '/search';

/**
 * Below this width the palette is a full-screen search (B+ `more-r3-search_m`)
 * rather than the floating ⌘K card: a 660px card has no room on a phone.
 * `ModalShell`'s sheet breakpoint, so the two modal families switch together.
 */
export const PALETTE_SHEET_QUERY = '(max-width: 639px)';
