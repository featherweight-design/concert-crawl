import type { VenueGlyphKey } from './glyphs';

/**
 * The multi-colour neon the venue hero boards draw
 * (`design/design_handoff_bplus_redesign/assets/venues/<key>-hero.html`, and
 * `screens/10-venue-art/hero-all.jpg`): every stroke of a glyph carries its own
 * colour, so Red Rocks is yellow and orange-red peaks with violet inner
 * strokes; the two halo discs behind it carry their own pair; and the night
 * the sign hangs in is the venue's own near-black. The tile icon
 * (`<key>-icon.svg`) stays a single two-stop gradient, as its boards draw it,
 * and that gradient's two colours are always two of these.
 *
 * These are fixed board art colours: they do not follow the theme, and they are
 * the only place the neon hexes live. `VENUE_NEON[key].shapeColors[i]` is the
 * colour of `VENUE_GLYPHS[key].shapes[i]`, in the same order.
 */
const CYAN = '#7AE6FF'; // fwd-allow-hex: board art colour
const BLUE = '#4DA3FF'; // fwd-allow-hex: board art colour
const PINK = '#FF7BD4'; // fwd-allow-hex: board art colour
const YELLOW = '#FFE36B'; // fwd-allow-hex: board art colour
const LIME = '#C9F26E'; // fwd-allow-hex: board art colour
const VIOLET = '#A075FF'; // fwd-allow-hex: board art colour
const AMBER = '#FFB838'; // fwd-allow-hex: board art colour
const ORANGE = '#FF6A3D'; // fwd-allow-hex: board art colour
const CORAL = '#FF6B8A'; // fwd-allow-hex: board art colour
const TEAL = '#5DD4D6'; // fwd-allow-hex: board art colour

export interface VenueNeonDef {
  /**
   * The venue's night, the `hs` gradient's base in its hero board: the ground
   * under the tints, and the fill of the ridge, the skyline and the brick
   * mortar, so the silhouettes read as holes in the tinted sky.
   */
  ground: string;
  /** One stroke colour per glyph shape, in `VENUE_GLYPHS[key].shapes` order. */
  shapeColors: readonly string[];
  /**
   * The fill of a `filled` shape (Bluebird's bird): the hero draws it at 30%
   * under the shape's stroke colour.
   */
  fillColor?: string;
  /**
   * The two flat halo discs behind the glyph, as the board draws them: the
   * outer (r210 of 420) and the inner (r130), each at 10%.
   */
  halo: { outer: string; inner: string };
}

export const VENUE_NEON: Record<VenueGlyphKey, VenueNeonDef> = {
  ballarena: {
    ground: '#06101F', // fwd-allow-hex: board art colour
    shapeColors: [CYAN, BLUE, PINK, YELLOW],
    halo: { outer: CYAN, inner: PINK },
  },
  blackbox: {
    ground: '#05060C', // fwd-allow-hex: board art colour
    shapeColors: [CYAN, VIOLET, LIME, PINK],
    halo: { outer: CYAN, inner: LIME },
  },
  bluebird: {
    ground: '#07102A', // fwd-allow-hex: board art colour
    shapeColors: [CYAN],
    fillColor: BLUE,
    halo: { outer: BLUE, inner: PINK },
  },
  cervantes: {
    ground: '#160D08', // fwd-allow-hex: board art colour
    shapeColors: [AMBER, ORANGE, CYAN, YELLOW, AMBER, ORANGE],
    halo: { outer: AMBER, inner: CYAN },
  },
  church: {
    ground: '#120A24', // fwd-allow-hex: board art colour
    shapeColors: [VIOLET, CORAL, TEAL, YELLOW, CORAL, TEAL, YELLOW, CORAL],
    halo: { outer: CORAL, inner: TEAL },
  },
  fiddlers: {
    ground: '#07140F', // fwd-allow-hex: board art colour
    shapeColors: [LIME, TEAL, AMBER, YELLOW, LIME, TEAL],
    halo: { outer: LIME, inner: AMBER },
  },
  fillmore: {
    ground: '#170D06', // fwd-allow-hex: board art colour
    shapeColors: [AMBER, YELLOW, CORAL, VIOLET, AMBER, YELLOW, CORAL],
    halo: { outer: AMBER, inner: CORAL },
  },
  globe: {
    ground: '#061413', // fwd-allow-hex: board art colour
    shapeColors: [TEAL, LIME, PINK, YELLOW],
    halo: { outer: TEAL, inner: PINK },
  },
  gothic: {
    ground: '#120C1E', // fwd-allow-hex: board art colour
    shapeColors: [YELLOW, AMBER, VIOLET, PINK, YELLOW],
    halo: { outer: YELLOW, inner: VIOLET },
  },
  hidive: {
    ground: '#06121C', // fwd-allow-hex: board art colour
    shapeColors: [CYAN, PINK, YELLOW, LIME, CYAN, PINK],
    halo: { outer: CYAN, inner: YELLOW },
  },
  junkyard: {
    ground: '#120E06', // fwd-allow-hex: board art colour
    shapeColors: [AMBER, LIME],
    halo: { outer: AMBER, inner: ORANGE },
  },
  larimer: {
    ground: '#190A10', // fwd-allow-hex: board art colour
    shapeColors: [CORAL, AMBER, CYAN, YELLOW, CORAL],
    halo: { outer: CORAL, inner: CYAN },
  },
  levitt: {
    ground: '#08130E', // fwd-allow-hex: board art colour
    shapeColors: [LIME, CYAN, PINK, YELLOW],
    halo: { outer: LIME, inner: PINK },
  },
  lostlake: {
    ground: '#070B1C', // fwd-allow-hex: board art colour
    shapeColors: [CYAN, VIOLET, YELLOW],
    halo: { outer: CYAN, inner: YELLOW },
  },
  marquis: {
    ground: '#170A18', // fwd-allow-hex: board art colour
    shapeColors: [PINK, YELLOW, CYAN, VIOLET],
    halo: { outer: PINK, inner: CYAN },
  },
  meowwolf: {
    ground: '#120A1E', // fwd-allow-hex: board art colour
    shapeColors: [PINK, LIME, CYAN],
    halo: { outer: PINK, inner: CYAN },
  },
  mission: {
    ground: '#0C0820', // fwd-allow-hex: board art colour
    shapeColors: [VIOLET, CYAN, PINK, YELLOW, VIOLET],
    halo: { outer: VIOLET, inner: PINK },
  },
  ogden: {
    ground: '#1A0B0A', // fwd-allow-hex: board art colour
    shapeColors: [ORANGE, YELLOW, PINK, CYAN, ORANGE, YELLOW, PINK],
    halo: { outer: ORANGE, inner: PINK },
  },
  oriental: {
    ground: '#07131A', // fwd-allow-hex: board art colour
    shapeColors: [TEAL, AMBER, CORAL, YELLOW, TEAL],
    halo: { outer: TEAL, inner: CORAL },
  },
  redrocks: {
    ground: '#140C22', // fwd-allow-hex: board art colour
    shapeColors: [AMBER, ORANGE, VIOLET, YELLOW],
    halo: { outer: ORANGE, inner: VIOLET },
  },
  summit: {
    ground: '#06101C', // fwd-allow-hex: board art colour
    shapeColors: [CYAN, LIME, VIOLET],
    halo: { outer: CYAN, inner: VIOLET },
  },
};
