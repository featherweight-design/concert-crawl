// The desktop admin shell's geometry: the sidebar's width, the content
// pane's gutters and a page's width cap. Its own module, with no imports, so
// a primitive can read it without pulling in the shell's nav and sidebar.
export const SIDEBAR_WIDTH = 232;
export const CONTENT_GUTTER_X = 28;
export const CONTENT_GUTTER_Y = 24;
/** The widest a venue page's column runs (`VenueDetailsClient`). */
export const PAGE_MAX_WIDTH = 1080;
/**
 * The gap between a venue page's header, tabs and panel; its skeleton too.
 * The loaded boards draw 18 (`04/venue-overview`, `venue-details`,
 * `venue-runs`, `venue-source`: the content column's `gap:18px`). The
 * `07/loading-venue-page` board draws 16; the loaded page wins so nothing
 * jumps on load (rule 9).
 */
export const VENUE_PAGE_GAP = 18;
