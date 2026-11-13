// The Crews boards' drawn surface, shared by the dialog shell and the options
// popover so a later change lands in one place: a lighter panel, a cyan-to-pink
// top edge over a quiet border, and a soft cyan glow.

/** Lighter than the page's elevated ground (crew_invite, crew_options). */
export const CREW_PANEL = 'color-mix(in srgb, var(--bg-elevated), white 6%)';

/** The three background layers of a bordered panel with a gradient top edge. */
export const CREW_EDGE_BACKGROUND = `linear-gradient(${CREW_PANEL}, ${CREW_PANEL}) padding-box, linear-gradient(90deg, var(--signal), var(--accent)) top / 100% 2px no-repeat border-box, var(--border-strong) border-box`;

export const CREW_DIALOG_GLOW =
  '0 0 64px -12px color-mix(in srgb, var(--signal) 30%, transparent)';
