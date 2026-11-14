// The desktop admin shell's geometry: the sidebar's width, the content
// pane's gutters and a page's width cap. Its own module, with no imports, so
// a primitive can read it without pulling in the shell's nav and sidebar.
export const SIDEBAR_WIDTH = 232;
export const CONTENT_GUTTER_X = 28;
export const CONTENT_GUTTER_Y = 24;
/** The widest a venue page's column runs (`VenueDetailsClient`). */
export const PAGE_MAX_WIDTH = 1080;
