// Search-surface tuning values. DATA, not copy.

/**
 * Below this width the artist row's follow control drops its label and renders
 * icon-only. 360 is the artist page's `AP_NARROW_BP` and the width the follow
 * spec names, so a 320px row keeps the name legible instead of ellipsising it
 * down to two characters beside a "Follow" label.
 */
export const SEARCH_FOLLOW_ICON_ONLY_QUERY = '(max-width: 359px)'

/**
 * Where the results list becomes the two-column desktop layout (list plus
 * explainer rail) and the follow controls step up from `sm` to `md`. Keyed to
 * Tailwind's `md:`, which is what the grid classes below use.
 */
export const SEARCH_DESKTOP_QUERY = '(min-width: 768px)'

/** The rail column width. Locked by the handoff's `minmax(0,1fr) 320px`. */
export const SEARCH_RAIL_WIDTH = 320
