import type { VenueHeroSetting } from './definitions/venue-settings';

const MOON_YELLOW = '#FFE36B'; // fwd-allow-hex: board art colour
const STAR_WHITE = '#FFFFFF'; // fwd-allow-hex: board art colour
const MASK_BLACK = '#000000'; // fwd-allow-hex: a mask cut-out, not a drawn colour

interface VenueBackdropProps {
  setting: VenueHeroSetting;
  /** The venue's two glyph colours, used for the tints. */
  from: string;
  to: string;
  /**
   * The venue's own night (`VENUE_NEON[key].ground`), the same ground the hero
   * paints: the ridge, the skyline and the brick mortar are cut from it.
   */
  ground: string;
  /** Unique suffix for ids inside the svg. */
  uid: string;
  /**
   * The venue page hero: from `sm` up the ridge and the skyline are drawn in
   * the board's 1200x420 box (the desktop hero boards), with the phone's
   * 380x200 layer kept below `sm`. The flagship cards leave this off.
   */
  wide?: boolean;
}

const SVG_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
} as const;

const STAR_RADII = [0.6, 0.9, 1.2] as const;
const STAR_OPACITIES = [0.2, 0.3, 0.4, 0.5] as const;

/** 32 deterministic stars across the sky, the board's `outdoor` set. */
const OUTDOOR_STARS = Array.from({ length: 32 }, (_, i) => ({
  cx: (101 + 97 * i) % 380,
  cy: (53 * i) % 110,
  radius: STAR_RADII[i % 3]!,
  opacity: STAR_OPACITIES[i % 4]!,
}));

const RIDGE =
  'M0 200 L0 130 L20 118 L40 113 L60 115 L80 113 L100 107 L120 108 L140 116 L160 122 L180 121 L200 127 L220 128 L240 126 L260 114 L280 109 L300 111 L320 115 L340 109 L360 110 L380 118';

/**
 * The desktop hero's ridge, in the board's own 1200x420 box
 * (`assets/venues/redrocks-hero.html`): it runs across the lower third and
 * the glyph sits on it.
 */
const WIDE_RIDGE =
  'M0 301 L20 290 L40 285 L60 286 L80 285 L100 279 L120 279 L140 287 L160 294 L180 293 L200 298 L220 300 L240 297 L260 286 L280 281 L300 282 L320 286 L340 281 L360 282 L380 290 L400 301 L420 300 L440 295 L460 292 L480 294 L500 283 L520 278 L540 280 L560 288 L580 285 L600 286 L620 294 L640 307 L660 299 L680 289 L700 286 L720 289 L740 283 L760 278 L780 280 L800 290 L820 291 L840 292 L860 299 L880 302 L900 295 L920 285 L940 281 L960 285 L980 284 L1000 280 L1020 283 L1040 292 L1060 299 L1080 299 L1100 295 L1120 294 L1140 291 L1160 282 L1180 278 L1200 282';

/** The board's 100 stars over the wide sky (cx steps 97, cy steps 53). */
const WIDE_STARS = Array.from({ length: 100 }, (_, i) => ({
  cx: (861 + 97 * i) % 1200,
  cy: (53 * i) % 231,
  radius: STAR_RADII[i % 3]!,
  opacity: STAR_OPACITIES[i % 4]!,
}));

/**
 * The desktop hero's skyline (`assets/venues/ballarena-hero.html`), in the
 * 1200x420 box: 26 buildings as [x, width, top y] across the full width, the
 * lower 20% of the hero.
 */
const WIDE_BUILDINGS = [
  [0, 24, 336],
  [27, 61, 285.12],
  [91, 58, 301.44],
  [152, 55, 317.76],
  [210, 52, 334.08],
  [265, 49, 283.2],
  [317, 46, 299.52],
  [366, 43, 315.84],
  [412, 40, 332.16],
  [455, 37, 281.28],
  [495, 34, 297.6],
  [532, 31, 313.92],
  [566, 28, 330.24],
  [597, 25, 279.36],
  [625, 62, 295.68],
  [690, 59, 312],
  [752, 56, 328.32],
  [811, 53, 277.44],
  [867, 50, 293.76],
  [920, 47, 310.08],
  [970, 44, 326.4],
  [1017, 41, 275.52],
  [1061, 38, 291.84],
  [1102, 35, 308.16],
  [1140, 32, 324.48],
  [1175, 29, 273.6],
] as const;

/** Every fifth building is lit: three columns of windows, 9px apart, from 6px under the roof. */
const WIDE_WINDOWS = WIDE_BUILDINGS.flatMap(([bx, , top], index) =>
  index % 5 === 0
    ? Array.from(
        { length: Math.max(0, Math.ceil((358 - (top + 6)) / 9)) },
        (_, row) => top + 6 + row * 9,
      ).flatMap((wy) =>
        [5, 12, 19].map((dx): readonly [number, number] => [bx + dx, wy]),
      )
    : [],
);

/** Buildings as [x, width, top y]; each runs off the bottom of the viewBox. */
const BUILDINGS = [
  [0, 24, 160],
  [27, 61, 135.77],
  [91, 58, 143.54],
  [152, 55, 151.31],
  [210, 52, 159.09],
  [265, 49, 134.86],
  [317, 46, 142.63],
  [366, 43, 150.4],
] as const;

const WINDOWS: readonly (readonly [number, number])[] = [
  [5, 166],
  [12, 166],
  [19, 166],
  ...[140.86, 149.86, 158.86, 167.86].flatMap((wy) =>
    [270, 277, 284].map((wx): readonly [number, number] => [wx, wy]),
  ),
];

const ARENA_STARS = [
  [47, 35, 0.85, 0.23],
  [94, 64, 1.1, 0.31],
  [141, 13, 0.6, 0.15],
  [36, 42, 0.85, 0.23],
  [83, 71, 1.1, 0.31],
  [130, 20, 0.6, 0.15],
  [25, 49, 0.85, 0.23],
  [72, 78, 1.1, 0.31],
  [119, 27, 0.6, 0.15],
  [14, 56, 0.85, 0.23],
  [61, 85, 1.1, 0.31],
] as const;

/**
 * The quiet layer behind a venue's sign, one of the board's three families:
 * brick courses (street), a night sky over the Front Range ridge (outdoor),
 * or a low skyline under a crescent moon (arena).
 */
export function VenueBackdrop({
  setting,
  from,
  to,
  ground,
  uid,
  wide = false,
}: VenueBackdropProps) {
  const phoneOnly = wide ? 'sm:hidden' : undefined;
  if (setting === 'outdoor') {
    const horizonId = `vn${uid}h`;
    return (
      <>
        {wide ? (
          <svg
            viewBox="0 0 1200 420"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
            focusable="false"
            data-venue-backdrop-wide="outdoor"
            className="hidden sm:block"
            style={SVG_STYLE}
          >
            {WIDE_STARS.map((star, i) => (
              <circle
                key={i}
                cx={star.cx}
                cy={star.cy}
                r={star.radius}
                fill={STAR_WHITE}
                opacity={star.opacity}
              />
            ))}
            <path d={`M0 420 ${WIDE_RIDGE} L1200 420 Z`} fill={ground} />
            <path
              d={WIDE_RIDGE}
              fill="none"
              stroke={to}
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
          </svg>
        ) : null}
        <svg
          viewBox="0 0 380 200"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          focusable="false"
          data-venue-backdrop="outdoor"
          className={phoneOnly}
          style={SVG_STYLE}
        >
          <defs>
            {/* The sky warms toward the horizon (the board's `hs12`), so the
              ridge reads as a solid dark silhouette against it. */}
            <linearGradient id={horizonId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.25" stopColor={to} stopOpacity={0} />
              <stop offset="0.62" stopColor={to} stopOpacity={0.34} />
            </linearGradient>
          </defs>
          <rect width="380" height="200" fill={`url(#${horizonId})`} />
          {OUTDOOR_STARS.map((star, i) => (
            <circle
              key={i}
              cx={star.cx}
              cy={star.cy}
              r={star.radius}
              fill={STAR_WHITE}
              opacity={star.opacity}
            />
          ))}
          <path d={`${RIDGE} L380 200 Z`} fill={ground} />
          <path
            d={RIDGE}
            fill="none"
            stroke={to}
            strokeOpacity={0.35}
            strokeWidth={1.5}
          />
        </svg>
      </>
    );
  }

  if (setting === 'arena') {
    const moonId = `vn${uid}m`;
    const moonMaskId = `vn${uid}mm`;
    return (
      <>
        {wide ? (
          <svg
            viewBox="0 0 1200 420"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
            focusable="false"
            data-venue-backdrop-wide="arena"
            className="hidden sm:block"
            style={SVG_STYLE}
          >
            {WIDE_BUILDINGS.map(([bx, width, top]) => (
              <rect
                key={bx}
                x={bx}
                y={top}
                width={width}
                height={420 - top + 60}
                fill={ground}
                stroke={from}
                strokeOpacity={0.18}
              />
            ))}
            {WIDE_WINDOWS.map(([wx, wy]) => (
              <rect
                key={`${wx}-${wy}`}
                x={wx}
                y={wy}
                width={2.5}
                height={3.5}
                fill={MOON_YELLOW}
                opacity={0.3}
              />
            ))}
          </svg>
        ) : null}
        <svg
          viewBox="0 0 380 200"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
          focusable="false"
          data-venue-backdrop="arena"
          className={phoneOnly}
          style={SVG_STYLE}
        >
          {BUILDINGS.map(([bx, width, top]) => (
            <rect
              key={bx}
              x={bx}
              y={top}
              width={width}
              height={200 - top + 52}
              fill={ground}
              stroke={from}
              strokeOpacity={0.18}
            />
          ))}
          {WINDOWS.map(([wx, wy]) => (
            <rect
              key={`${wx}-${wy}`}
              x={wx}
              y={wy}
              width={2.5}
              height={3.5}
              fill={MOON_YELLOW}
              opacity={0.3}
            />
          ))}
        </svg>
        {/* The moon and its stars are their own top-left layer at a fixed size,
            not part of the sliced skyline: a wide, short hero crops the top of
            the skyline's box, and the moon would go with it. The venue page's
            back chip sits at the far left (14px in, 36px wide), so the layer
            starts 48px in and the moon clears it. */}
        <svg
          viewBox="0 0 150 100"
          width={150}
          height={100}
          aria-hidden="true"
          focusable="false"
          data-venue-moon=""
          style={{ position: 'absolute', left: 48, top: 0, display: 'block' }}
        >
          <defs>
            <radialGradient id={moonId}>
              <stop offset="0" stopColor={MOON_YELLOW} stopOpacity={0.22} />
              <stop offset="1" stopColor={MOON_YELLOW} stopOpacity={0} />
            </radialGradient>
            <mask id={moonMaskId}>
              <rect width="150" height="100" fill={STAR_WHITE} />
              <circle cx="45" cy="36" r="14" fill={MASK_BLACK} />
            </mask>
          </defs>
          <circle cx="38" cy="40" r="42" fill={`url(#${moonId})`} />
          <circle
            cx="38"
            cy="40"
            r="14"
            fill={MOON_YELLOW}
            opacity={0.55}
            mask={`url(#${moonMaskId})`}
          />
          {ARENA_STARS.map(([sx, sy, radius, opacity]) => (
            <circle
              key={`${sx}-${sy}`}
              cx={sx}
              cy={sy}
              r={radius}
              fill={STAR_WHITE}
              opacity={opacity}
            />
          ))}
        </svg>
      </>
    );
  }

  return (
    <div
      data-venue-backdrop="street"
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.07,
        backgroundImage: [
          `repeating-linear-gradient(0deg, transparent 0 12px, ${ground} 12px 16px)`,
          `repeating-linear-gradient(90deg, ${to} 0 40px, transparent 40px 44px)`,
        ].join(', '),
        maskImage: `linear-gradient(180deg, transparent, ${MASK_BLACK})`,
        WebkitMaskImage: `linear-gradient(180deg, transparent, ${MASK_BLACK})`,
      }}
    />
  );
}
