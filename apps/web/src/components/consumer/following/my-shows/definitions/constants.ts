// Routes and geometry for My shows ▸ Artists.

/**
 * There is no `/artists` index and this epic does not add one, so every
 * "find more" affordance points at search. `/following` is deliberately not
 * `/artists/...`: middleware lists `/artists(.*)` as public-once-launched.
 */
export const FIND_ARTISTS_HREF = '/search'

/** The always-works fallback when the plan cannot follow. */
export const BROWSE_HREF = '/events'

/** The ghost CTA on the empty state: follow from a show you already track. */
export const WATCHING_HREF = '/watching'

/** Alerts deep-links into the existing preference surface, not a second control. */
export const ALERTS_HREF = '/me#notifications'

/** Row artwork, and the dashed square on the find row, at each density. */
export const ROW_ART_SIZE = 56
export const ROW_ART_SIZE_NARROW = 48
/** Desktop card artwork. */
export const CARD_ART_SIZE = 52
