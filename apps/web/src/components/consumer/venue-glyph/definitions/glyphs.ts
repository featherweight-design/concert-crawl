/**
 * The 21 venue glyphs from the B+ handoff
 * (`design/design_handoff_bplus_redesign/assets/venues/<key>-icon.svg`).
 * Each glyph is drawn on a 24×24 grid as round-capped strokes in its venue's
 * two-stop gradient. The tile ground is not stored here: it is the theme's
 * `--surface-1`, which is the colour the assets were drawn on.
 */

export const VENUE_GLYPH_KEYS = [
  'ballarena',
  'blackbox',
  'bluebird',
  'cervantes',
  'church',
  'fiddlers',
  'fillmore',
  'globe',
  'gothic',
  'hidive',
  'junkyard',
  'larimer',
  'levitt',
  'lostlake',
  'marquis',
  'meowwolf',
  'mission',
  'ogden',
  'oriental',
  'redrocks',
  'summit',
] as const;

export type VenueGlyphKey = (typeof VENUE_GLYPH_KEYS)[number];

export type VenueGlyphShape =
  | { kind: 'path'; pathData: string; transform?: string; filled?: true }
  | { kind: 'circle'; cx: number; cy: number; radius: number };

export interface VenueGlyphDef {
  /** Gradient start (top left). */
  from: string;
  /** Gradient end (bottom right). */
  to: string;
  shapes: readonly VenueGlyphShape[];
}

export const VENUE_GLYPHS: Record<VenueGlyphKey, VenueGlyphDef> = {
  ballarena: {
    from: '#4DA3FF',
    to: '#7AE6FF',
    shapes: [
      { kind: 'path', pathData: 'M2.5 12.5Q12 4.5 21.5 12.5' },
      { kind: 'path', pathData: 'M2.5 12.5v5Q12 22.5 21.5 17.5v-5' },
      { kind: 'path', pathData: 'M7 9.2v10.6M12 8.5v12M17 9.2v10.6' },
      { kind: 'path', pathData: 'M2.5 15Q12 19.6 21.5 15' },
    ],
  },
  blackbox: {
    from: '#A075FF',
    to: '#7AE6FF',
    shapes: [
      { kind: 'path', pathData: 'M12 2.5l8.5 4.6v9.8L12 21.5l-8.5-4.6V7.1z' },
      { kind: 'path', pathData: 'M3.5 7.1L12 11.7l8.5-4.6' },
      { kind: 'path', pathData: 'M12 11.7v9.8' },
      { kind: 'path', pathData: 'M6.5 13v2.5M8.5 12.5v5' },
    ],
  },
  bluebird: {
    from: '#7AE6FF',
    to: '#4DA3FF',
    shapes: [
      {
        kind: 'path',
        pathData:
          'M302.0 0.7Q302.7 0.0 315.3 2.7Q328.0 5.3 347.3 16.7Q366.7 28.0 374.0 36.0Q381.3 44.0 390.0 62.0Q398.7 80.0 399.3 94.0Q400.0 108.0 393.3 127.3Q386.7 146.7 383.3 153.3Q380.0 160.0 360.0 181.3Q340.0 202.7 343.3 210.0Q346.7 217.3 364.0 230.0Q381.3 242.7 384.7 262.0Q388.0 281.3 386.0 288.0Q384.0 294.7 378.0 296.7Q372.0 298.7 348.0 290.7Q324.0 282.7 298.0 285.3Q272.0 288.0 262.7 292.7Q253.3 297.3 242.0 310.7Q230.7 324.0 224.0 327.3Q217.3 330.7 210.7 343.3Q204.0 356.0 187.3 367.3Q170.7 378.7 153.3 383.3Q136.0 388.0 127.3 394.0Q118.7 400.0 100.7 399.3Q82.7 398.7 67.3 394.7Q52.0 390.7 26.0 371.3Q0.0 352.0 4.7 346.0Q9.3 340.0 23.3 336.7Q37.3 333.3 46.0 326.7Q54.7 320.0 88.0 277.3Q121.3 234.7 118.7 230.0Q116.0 225.3 105.3 222.7Q94.7 220.0 76.7 220.7Q58.7 221.3 42.7 225.3Q26.7 229.3 18.0 224.0Q9.3 218.7 11.3 210.7Q13.3 202.7 27.3 196.0Q41.3 189.3 66.7 160.7Q92.0 132.0 103.3 99.3Q114.7 66.7 120.0 66.7Q125.3 66.7 146.7 97.3Q168.0 128.0 188.0 134.0Q208.0 140.0 218.7 126.7Q229.3 113.3 249.3 97.3Q269.3 81.3 280.7 68.0Q292.0 54.7 295.3 46.0Q298.7 37.3 296.0 22.7Q293.3 8.0 297.3 4.7Q301.3 1.3 302.0 0.7Z',
        transform: 'translate(4.56 4.56) scale(0.0372)',
        filled: true,
      },
    ],
  },
  cervantes: {
    from: '#FF6A3D',
    to: '#FFB838',
    shapes: [
      { kind: 'path', pathData: 'M2.5 12h12.5' },
      {
        kind: 'path',
        pathData: 'M15 12c2.2-.6 4.4-2.4 6.5-4.6v9.2c-2.1-2.2-4.3-4-6.5-4.6',
      },
      { kind: 'path', pathData: 'M7 12V8.5M9.6 12V8.5M12.2 12V8.5' },
      { kind: 'path', pathData: 'M6.2 8.5h1.6M8.8 8.5h1.6M11.4 8.5h1.6' },
      { kind: 'path', pathData: 'M5 12c0 3 2 4.5 5 4.5h5' },
      { kind: 'path', pathData: 'M2.5 10.6v2.8' },
    ],
  },
  church: {
    from: '#A075FF',
    to: '#FF6B8A',
    shapes: [
      { kind: 'circle', cx: 12, cy: 12, radius: 9.6 },
      { kind: 'circle', cx: 12, cy: 6.6, radius: 3.1 },
      { kind: 'circle', cx: 16.68, cy: 9.3, radius: 3.1 },
      { kind: 'circle', cx: 16.68, cy: 14.7, radius: 3.1 },
      { kind: 'circle', cx: 12, cy: 17.4, radius: 3.1 },
      { kind: 'circle', cx: 7.32, cy: 14.7, radius: 3.1 },
      { kind: 'circle', cx: 7.32, cy: 9.3, radius: 3.1 },
      { kind: 'circle', cx: 12, cy: 12, radius: 1.5 },
    ],
  },
  fiddlers: {
    from: '#5DD4D6',
    to: '#C9F26E',
    shapes: [
      {
        kind: 'path',
        pathData:
          'M12 8.5c-2.4 0-3.4 1.2-3.4 2.6 0 .9.7 1.3.7 2s-1.4 1.2-1.4 3c0 2.6 1.8 4.4 4.1 4.4s4.1-1.8 4.1-4.4c0-1.8-1.4-2.3-1.4-3s.7-1.1.7-2c0-1.4-1-2.6-3.4-2.6z',
      },
      { kind: 'path', pathData: 'M12 8.5V2.6' },
      { kind: 'path', pathData: 'M12 2.6c1.3 0 1.7-1.3.5-1.3' },
      { kind: 'path', pathData: 'M10.4 13.5v2.6M13.6 13.5v2.6' },
      { kind: 'path', pathData: 'M10.6 18.4h2.8' },
      { kind: 'path', pathData: 'M19 4.5l-3 15' },
    ],
  },
  fillmore: {
    from: '#FFE36B',
    to: '#FFB838',
    shapes: [
      { kind: 'path', pathData: 'M12 1.5v3.5' },
      { kind: 'circle', cx: 12, cy: 6.6, radius: 1.6 },
      { kind: 'path', pathData: 'M4 10.5q8 6.5 16 0' },
      {
        kind: 'path',
        pathData: 'M4 10.5V8.2M8 12.6V9.6M12 13.3V9.2M16 12.6V9.6M20 10.5V8.2',
      },
      {
        kind: 'path',
        pathData: 'M4 6.8v.01M8 8.2v.01M12 7.8v.01M16 8.2v.01M20 6.8v.01',
      },
      { kind: 'path', pathData: 'M7 15.5l-.6 2.4M12 16.2v3.4M17 15.5l.6 2.4' },
      { kind: 'path', pathData: 'M10.4 21.5h3.2' },
    ],
  },
  globe: {
    from: '#C9F26E',
    to: '#5DD4D6',
    shapes: [
      { kind: 'circle', cx: 12, cy: 10.5, radius: 7.5 },
      { kind: 'path', pathData: 'M12 3a4 7.5 0 0 0 0 15 4 7.5 0 0 0 0-15' },
      { kind: 'path', pathData: 'M4.8 8.2h14.4M4.8 12.8h14.4' },
      {
        kind: 'path',
        pathData: 'M5.2 15.8a8.6 8.6 0 0 0 13.6 0M12 19.4v2.1M9 21.5h6',
      },
    ],
  },
  gothic: {
    from: '#FFB838',
    to: '#FFE36B',
    shapes: [
      { kind: 'path', pathData: 'M6.5 21.5V11Q6.5 5 12 2q5.5 3 5.5 9v10.5' },
      { kind: 'path', pathData: 'M12 21.5V12' },
      { kind: 'path', pathData: 'M6.5 14.5h11' },
      { kind: 'circle', cx: 12, cy: 8.6, radius: 1.8 },
      { kind: 'path', pathData: 'M4 21.5h16' },
    ],
  },
  hidive: {
    from: '#FF7BD4',
    to: '#7AE6FF',
    shapes: [
      { kind: 'path', pathData: 'M4 21.5V6.5M7.5 21.5V6.5' },
      { kind: 'path', pathData: 'M4 10.5h3.5M4 14.5h3.5M4 18.5h3.5' },
      { kind: 'path', pathData: 'M4 6.5h16' },
      { kind: 'path', pathData: 'M20 6.5v1.6' },
      {
        kind: 'path',
        pathData: 'M14 20.5c1.2-1.4 2.3-1.4 3.4 0s2.3 1.4 3.4 0',
      },
      { kind: 'path', pathData: 'M19 10.5q1.6 3 .4 6.5' },
    ],
  },
  junkyard: {
    from: '#C9F26E',
    to: '#FFB838',
    shapes: [
      {
        kind: 'path',
        pathData:
          'M12.07 2.60L13.77 2.77L14.80 5.37L15.96 5.98L18.70 5.40L19.78 6.72L18.67 9.29L19.05 10.54L21.40 12.07L21.23 13.77L18.63 14.80L18.02 15.96L18.60 18.70L17.28 19.78L14.71 18.67L13.46 19.05L11.93 21.40L10.23 21.23L9.20 18.63L8.04 18.02L5.30 18.60L4.22 17.28L5.33 14.71L4.95 13.46L2.60 11.93L2.77 10.23L5.37 9.20L5.98 8.04L5.40 5.30L6.72 4.22L9.29 5.33L10.54 4.95Z',
      },
      { kind: 'circle', cx: 12, cy: 12, radius: 3.2 },
    ],
  },
  larimer: {
    from: '#FFB838',
    to: '#FF6B8A',
    shapes: [
      {
        kind: 'path',
        pathData: 'M10 2.8a2.2 2.2 0 0 1 4 0v5a2.2 2.2 0 0 1-4 0z',
      },
      { kind: 'path', pathData: 'M7.8 7.8a4.2 4.2 0 0 0 8.4 0' },
      { kind: 'path', pathData: 'M12 12v9.5' },
      { kind: 'path', pathData: 'M8 21.5h8' },
      { kind: 'path', pathData: 'M10 5h4' },
    ],
  },
  levitt: {
    from: '#7AE6FF',
    to: '#C9F26E',
    shapes: [
      { kind: 'path', pathData: 'M2 17.5Q12 1.5 22 17.5' },
      { kind: 'path', pathData: 'M6.5 17.5Q12 8 17.5 17.5' },
      { kind: 'path', pathData: 'M3.5 17.5h17' },
      { kind: 'path', pathData: 'M3 21h2.5M8 21h2.5M13.5 21h2.5M18.5 21h2.5' },
    ],
  },
  lostlake: {
    from: '#A075FF',
    to: '#7AE6FF',
    shapes: [
      {
        kind: 'path',
        pathData: 'M15.5 3.2a5.2 5.2 0 1 0 5 7.4 4.2 4.2 0 0 1-5-7.4z',
      },
      {
        kind: 'path',
        pathData:
          'M2 15c2.5-1.8 3.5-1.8 5 0s2.5 1.8 5 0 2.5-1.8 5 0 2.5 1.8 5 0',
      },
      {
        kind: 'path',
        pathData: 'M5 19c2-1.4 3-1.4 4.6 0s2.6 1.4 4.8 0 2.6-1.4 4.6 0',
      },
    ],
  },
  marquis: {
    from: '#FFE36B',
    to: '#FF7BD4',
    shapes: [
      { kind: 'path', pathData: 'M3 4.5h18v9.5H3z' },
      {
        kind: 'path',
        pathData: 'M6 2.5h.01M9 2.5h.01M12 2.5h.01M15 2.5h.01M18 2.5h.01',
      },
      { kind: 'path', pathData: 'M6.5 8h11M8 11h8' },
      { kind: 'path', pathData: 'M7 14v7.5M17 14v7.5' },
    ],
  },
  meowwolf: {
    from: '#C9F26E',
    to: '#FF7BD4',
    shapes: [
      { kind: 'path', pathData: 'M4 21V9l3.5-6 3.5 4h2l3.5-4L20 9v12' },
      { kind: 'circle', cx: 12, cy: 14, radius: 4.2 },
      { kind: 'circle', cx: 12, cy: 14, radius: 1.4 },
    ],
  },
  mission: {
    from: '#7AE6FF',
    to: '#A075FF',
    shapes: [
      { kind: 'path', pathData: 'M12 1.5v3.5' },
      { kind: 'circle', cx: 12, cy: 13, radius: 8 },
      { kind: 'path', pathData: 'M4 13h16M5.2 9h13.6M5.2 17h13.6' },
      { kind: 'path', pathData: 'M8 5.9v14.2M12 5v16M16 5.9v14.2' },
      { kind: 'path', pathData: 'M20.5 1.8v3M19 3.3h3' },
    ],
  },
  ogden: {
    from: '#FFE36B',
    to: '#FF6A3D',
    shapes: [
      { kind: 'path', pathData: 'M1.5 7.5l2.5-3h4.5l2.5 3z' },
      { kind: 'path', pathData: 'M13 7.5l2.5-3H20l2.5 3z' },
      { kind: 'path', pathData: 'M2.5 7.5v14M10 7.5V11M14 7.5V11M21.5 7.5v14' },
      { kind: 'path', pathData: 'M10 9h4' },
      { kind: 'path', pathData: 'M4 11h16v6H4z' },
      { kind: 'path', pathData: 'M6.5 13.5h11' },
      { kind: 'path', pathData: 'M1.5 21.5h21' },
    ],
  },
  oriental: {
    from: '#FFB838',
    to: '#5DD4D6',
    shapes: [
      {
        kind: 'path',
        pathData: 'M12 1.2c1.5 1 2 2.4 1.1 3.8h-2.2c-.9-1.4-.4-2.8 1.1-3.8z',
      },
      { kind: 'path', pathData: 'M10 5h4v12h-4z' },
      { kind: 'path', pathData: 'M12 7.5v.01M12 10v.01M12 12.5v.01M12 15v.01' },
      { kind: 'path', pathData: 'M3.5 21.5V8h3v13.5M17.5 21.5V8h3v13.5' },
      { kind: 'path', pathData: 'M2.5 21.5h19' },
    ],
  },
  redrocks: {
    from: '#FFB838',
    to: '#FF6A3D',
    shapes: [
      { kind: 'path', pathData: 'M2.5 18.5L12.5 9.5l2.5 1.4-3 7.6z' },
      { kind: 'path', pathData: 'M10 18.5L20 5.5l2 2.2-2.4 10.8' },
      {
        kind: 'path',
        pathData: 'M6.2 16l4.2-3.4M14.2 14.8l4.4-4.6M15.6 17.4l3.2-3.2',
      },
      { kind: 'path', pathData: 'M1.5 21h21' },
    ],
  },
  summit: {
    from: '#C9F26E',
    to: '#7AE6FF',
    shapes: [
      { kind: 'path', pathData: 'M1.5 20.5l7-11 3 4 3.6-7 7.4 14z' },
      { kind: 'path', pathData: 'M13.4 9.6l1.7-3.2 1.9 3.6-1.6-.8z' },
      { kind: 'path', pathData: 'M5 4.5h.01M9 2.8h.01M19.5 3.5h.01' },
    ],
  },
};
