/**
 * The admin's floating-surface shadows. `--shadow-strong` is a bare colour,
 * so `boxShadow: 'var(--shadow-strong)'` alone is invalid and draws nothing;
 * each shadow here takes its board's offsets and blur and the token's colour
 * (as CCOverlay does).
 */

/** A menu: `43/approve-menu-d` and `07/user-menu-desktop` draw `0 18px 40px`. */
export const MENU_SHADOW = '0 18px 40px var(--shadow-strong)';

/**
 * A bottom toast: `07/role-changed-with-undo`, `43/approve-done-d` and
 * `43/approve-m` draw `0 14px 30px`.
 */
export const TOAST_SHADOW = '0 14px 30px var(--shadow-strong)';

/**
 * A panel overlaying the page from the right: `07/a-code-in-flow` and
 * `12/code-taken-d` draw `-18px 0 40px`, cast leftward over the scrim.
 */
export const PANEL_SHADOW = '-18px 0 40px var(--shadow-strong)';

/**
 * The events queue's floating bulk bar: the admin UI handoff
 * (`admin-events.jsx`, BulkActionBar) draws `--shadow-lg`, `0 12px 32px`.
 */
export const FLOATING_BAR_SHADOW = '0 12px 32px var(--shadow-strong)';
