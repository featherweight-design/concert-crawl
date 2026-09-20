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

/**
 * The search field's box, shared rather than matched.
 *
 * `/search`'s bar and the onboarding tour's in-step field are meant to be the
 * SAME object — a reader who has used one should not feel they have met a
 * second search — and "the same values, written twice" drifts the first time
 * either moves. Exported from the search surface because that is where the
 * field originates; the tour is the borrower.
 *
 * The 16px font size belongs with it: below 16 iOS Safari zooms the page on
 * focus, which inside the tour's fixed-height card pushes the commit rail off
 * screen.
 */
export const SEARCH_FIELD_BOX = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  height: 44,
  padding: '0 14px',
  borderRadius: 12,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
} as const

export const SEARCH_FIELD_FONT_SIZE = 16
