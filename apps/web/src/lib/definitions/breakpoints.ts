// Media queries shared across features. The phone layout holds up to 1023px
// (tablet option A, Hugh 2026-11-14), so a surface splitting sheet-vs-popover or
// mobile-vs-desktop reads the same line the CSS does: desktop starts at 1024.

export const MOBILE_VIEWPORT_QUERY = '(max-width: 1023px)';
export const DESKTOP_VIEWPORT_QUERY = '(min-width: 1024px)';
