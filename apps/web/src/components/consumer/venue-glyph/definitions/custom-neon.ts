/**
 * The neon a venue's own glyph (not one of the drawn 21) is shown in on the
 * Icon step's hero preview (`05/step-3-icon-optional`: "one color per stroke
 * group from its palette"). The drawn 21 each carry a hand-picked colour per
 * stroke (`VENUE_NEON`); a custom glyph has no such table, so its strokes take
 * these colours in order and wrap. The hexes are the same board art colours
 * `VENUE_NEON` uses.
 */
const AMBER = '#FFB838'; // fwd-allow-hex: board art colour
const PINK = '#FF7BD4'; // fwd-allow-hex: board art colour
const CYAN = '#7AE6FF'; // fwd-allow-hex: board art colour
const YELLOW = '#FFE36B'; // fwd-allow-hex: board art colour
const LIME = '#C9F26E'; // fwd-allow-hex: board art colour
const VIOLET = '#A075FF'; // fwd-allow-hex: board art colour
const NIGHT = '#0A0E1F'; // fwd-allow-hex: the hero's night, a near-black like the venues' own

export const CUSTOM_NEON = {
  ground: NIGHT,
  from: AMBER,
  to: PINK,
  halo: { outer: AMBER, inner: PINK },
  strokes: [AMBER, PINK, CYAN, YELLOW, LIME, VIOLET],
} as const;

/** The colour of a custom glyph's `index`th shape. */
export const customStrokeColour = (index: number): string =>
  CUSTOM_NEON.strokes[index % CUSTOM_NEON.strokes.length] ?? CUSTOM_NEON.from;
