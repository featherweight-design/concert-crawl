import type { ReactNode } from 'react';

// The board's fixed neon set for scene lights (addendum 4 item 1): like the
// arena's window yellow, these never take the venue's colours, so a light never
// vanishes into a venue of the same hue.
const NEON_CYAN = '#7AE6FF'; // fwd-allow-hex: board art colour
const NEON_YELLOW = '#FFE36B'; // fwd-allow-hex: board art colour
const NEON_PINK = '#FF7BD4'; // fwd-allow-hex: board art colour
const NEON_LIME = '#C9F26E'; // fwd-allow-hex: board art colour

interface SceneProps {
  from: string;
  to: string;
  ground: string;
  /** Unique suffix for ids inside the svg. */
  uid: string;
  /** The venue page hero also draws the 1200x420 box from `lg` up. */
  wide: boolean;
}

/** The two boxes every scene is drawn in: the phone layer and the wide hero. */
interface Box {
  width: number;
  height: number;
  /** Stroke and radius multiplier against the phone box. */
  k: number;
  name: 'phone' | 'wide';
}

const PHONE: Box = { width: 380, height: 200, k: 1, name: 'phone' };
const WIDE: Box = { width: 1200, height: 420, k: 1.8, name: 'wide' };

const SVG_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
} as const;

function boxes(wide: boolean): Box[] {
  return wide ? [PHONE, WIDE] : [PHONE];
}

function visibility(box: Box, wide: boolean): string {
  if (!wide) return 'block';
  return box.name === 'wide' ? 'hidden lg:block' : 'block lg:hidden';
}

/** One sliced scene layer; the caller draws into the box. */
function SceneLayer({
  box,
  wide,
  setting,
  children,
}: {
  box: Box;
  wide: boolean;
  setting: string;
  children: ReactNode;
}) {
  const attr =
    box.name === 'wide'
      ? { 'data-venue-backdrop-wide': setting }
      : { 'data-venue-backdrop': setting };
  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={visibility(box, wide)}
      style={SVG_STYLE}
      {...attr}
    >
      {children}
    </svg>
  );
}

/**
 * A strip pinned to the top at its own size. The scene slices from the bottom,
 * so a wide, short hero crops its top; the bulbs, the valance and the truss
 * live here so they survive the crop (`01/hero-venue-page-crop-d`).
 */
function StripLayer({
  box,
  wide,
  setting,
  height,
  children,
}: {
  box: Box;
  wide: boolean;
  setting: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${box.width} ${height}`}
      preserveAspectRatio="xMidYMin meet"
      width="100%"
      height={height}
      aria-hidden="true"
      focusable="false"
      data-venue-strip={`${setting}-${box.name}`}
      className={visibility(box, wide)}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {children}
    </svg>
  );
}

const BULB_OPACITIES = [0.35, 0.55, 0.75] as const;

/** Theater (Ogden): curtain folds, a valance swag, marquee bulbs, a stage lip. */
export function TheaterBackdrop({ from, ground, wide }: SceneProps) {
  return (
    <>
      {boxes(wide).map((box) => {
        const isWide = box.name === 'wide';
        const foldStep = isWide ? 26 : 8.7;
        const foldWidth = isWide ? 27 : 9.7;
        const rightStart = isWide ? 1010 : 319;
        const lipY = isWide ? 370 : 176;
        return (
          <SceneLayer key={box.name} box={box} wide={wide} setting="theater">
            {Array.from({ length: 8 }, (_, i) => {
              const opacity = i % 2 === 0 ? 0.1 : 0.17;
              return (
                <g key={i}>
                  <rect
                    x={foldStep * i}
                    y={0}
                    width={foldWidth}
                    height={box.height}
                    fill={from}
                    opacity={opacity}
                  />
                  <rect
                    x={rightStart + foldStep * i}
                    y={0}
                    width={foldWidth}
                    height={box.height}
                    fill={from}
                    opacity={opacity}
                  />
                </g>
              );
            })}
            <rect
              x={0}
              y={lipY}
              width={box.width}
              height={box.height - lipY}
              fill={ground}
              opacity={0.8}
            />
            <path
              d={`M0 ${lipY}H${box.width}`}
              stroke={NEON_CYAN}
              strokeOpacity={0.25}
            />
          </SceneLayer>
        );
      })}
      {boxes(wide).map((box) => {
        const isWide = box.name === 'wide';
        const height = isWide ? 126 : 64;
        const edgeY = isWide ? 44 : 20;
        const dipY = isWide ? 114 : 52;
        const step = isWide ? 64 : 26;
        const startX = isWide ? 32 : 13;
        const count = isWide ? 19 : 15;
        const bulbY = isWide ? 22 : 10;
        return (
          <StripLayer
            key={box.name}
            box={box}
            wide={wide}
            setting="theater"
            height={height}
          >
            <path
              d={`M0 ${edgeY} Q${box.width / 2} ${dipY} ${box.width} ${edgeY} L${box.width} 0 L0 0Z`}
              fill={from}
              opacity={0.16}
            />
            {Array.from({ length: count }, (_, i) => {
              const cx = startX + step * i;
              const opacity = BULB_OPACITIES[i % 3]!;
              return (
                <g key={i}>
                  {isWide ? (
                    <circle
                      cx={cx}
                      cy={bulbY}
                      r={15.6}
                      fill={NEON_CYAN}
                      opacity={0.07}
                    />
                  ) : null}
                  <circle
                    cx={cx}
                    cy={bulbY}
                    r={isWide ? 6 : 3.2}
                    fill={NEON_CYAN}
                    opacity={opacity}
                  />
                </g>
              );
            })}
          </StripLayer>
        );
      })}
    </>
  );
}

/** The four club lamps: x as a fraction of the width, beam floor span, tone. */
const CLUB_BEAMS = [
  { x: 0.18, near: 0.24, far: 0.36, tone: NEON_YELLOW, alpha: 0.32, big: true },
  {
    x: 0.46,
    near: 0.375,
    far: 0.445,
    tone: NEON_LIME,
    alpha: 0.16,
    big: false,
  },
  {
    x: 0.62,
    near: 0.645,
    far: 0.715,
    tone: NEON_YELLOW,
    alpha: 0.16,
    big: false,
  },
  { x: 0.86, near: 0.49, far: 0.61, tone: NEON_PINK, alpha: 0.32, big: true },
] as const;

const CLUB_PINS = [
  { x: 0.092, tone: NEON_YELLOW },
  { x: 0.276, tone: NEON_PINK },
] as const;

/** Club (Hi-Dive): a truss, four lamps with beams, pin spots, haze, a floor. */
export function ClubBackdrop({ to, ground, uid, wide }: SceneProps) {
  return (
    <>
      {boxes(wide).map((box) => {
        const isWide = box.name === 'wide';
        const trussY = isWide ? 18 : 6;
        const floorY = isWide ? 353 : 168;
        const hazeId = `vn${uid}hz${box.name}`;
        return (
          <SceneLayer key={box.name} box={box} wide={wide} setting="club">
            <defs>
              <radialGradient id={hazeId} cx="0.5" cy="0.75" r="0.6">
                <stop offset="0" stopColor={to} stopOpacity={0.14} />
                <stop offset="1" stopColor={to} stopOpacity={0} />
              </radialGradient>
              {CLUB_BEAMS.map((beam, i) => (
                <linearGradient
                  key={i}
                  id={`vn${uid}cl${box.name}${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0"
                    stopColor={beam.tone}
                    stopOpacity={beam.alpha}
                  />
                  <stop offset="1" stopColor={beam.tone} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {CLUB_BEAMS.map((beam, i) => {
              const lamp = beam.x * box.width;
              return (
                <path
                  key={i}
                  d={`M${lamp - 2} ${trussY} L${lamp + 2} ${trussY} L${beam.far * box.width} ${floorY} L${beam.near * box.width} ${floorY}Z`}
                  fill={`url(#vn${uid}cl${box.name}${i})`}
                />
              );
            })}
            <rect
              width={box.width}
              height={box.height}
              fill={`url(#${hazeId})`}
            />
            <rect
              x={0}
              y={floorY}
              width={box.width}
              height={box.height}
              fill={ground}
            />
            <path
              d={`M0 ${floorY}H${box.width}`}
              stroke={to}
              strokeOpacity={0.4}
              strokeWidth={1.5}
            />
          </SceneLayer>
        );
      })}
      {boxes(wide).map((box) => {
        const isWide = box.name === 'wide';
        const height = isWide ? 30 : 18;
        const trussY = isWide ? 18 : 6;
        const { k } = box;
        return (
          <StripLayer
            key={box.name}
            box={box}
            wide={wide}
            setting="club"
            height={height}
          >
            <path
              d={`M0 ${trussY}H${box.width}`}
              stroke={to}
              strokeOpacity={0.25}
              strokeWidth={2 * k}
            />
            {CLUB_BEAMS.map((beam, i) => (
              <circle
                key={i}
                cx={beam.x * box.width}
                cy={trussY}
                r={(beam.big ? 6 : 4) * k}
                fill={beam.tone}
                opacity={beam.big ? 0.75 : 0.6}
              />
            ))}
            {CLUB_PINS.map((pin, i) => (
              <g key={i}>
                <circle
                  cx={pin.x * box.width}
                  cy={trussY}
                  r={8 * k}
                  fill={pin.tone}
                  opacity={0.08}
                />
                <circle
                  cx={pin.x * box.width}
                  cy={trussY}
                  r={2.4 * k}
                  fill={pin.tone}
                  opacity={0.5}
                />
              </g>
            ))}
          </StripLayer>
        );
      })}
    </>
  );
}

/** Depth lines as a share of the floor's height below the horizon. */
const GALLERY_DEPTHS = [0.06, 0.172, 0.33, 0.52, 0.742, 1] as const;

/** Three lit panels on the back wall, as fractions of the phone box. */
const GALLERY_PANELS = [
  { x: 23, y: 28, width: 38, height: 45, tone: NEON_CYAN },
  { x: 76, y: 16, width: 23, height: 60, tone: NEON_YELLOW },
  { x: 319, y: 24, width: 34, height: 51, tone: NEON_LIME },
] as const;

/** Gallery (Meow Wolf): a room in one-point perspective, no top strip. */
export function GalleryBackdrop({ to, ground, wide }: SceneProps) {
  return (
    <>
      {boxes(wide).map((box) => {
        const horizon = Math.round(box.height * 0.42);
        const vanishX = box.width / 2;
        const floor = box.height - horizon;
        const rayStep = box.width * (60 / 380);
        const sx = box.width / 380;
        const sy = box.height / 200;
        return (
          <SceneLayer key={box.name} box={box} wide={wide} setting="gallery">
            <rect
              x={0}
              y={horizon}
              width={box.width}
              height={floor}
              fill={ground}
              opacity={0.6}
            />
            {Array.from({ length: 20 }, (_, i) => (
              <path
                key={i}
                d={`M${vanishX} ${horizon} L${-box.width + rayStep * i} ${box.height}`}
                stroke={to}
                strokeOpacity={0.12}
              />
            ))}
            {GALLERY_DEPTHS.map((depth) => {
              const y = Math.round(horizon + floor * depth);
              return (
                <path
                  key={depth}
                  d={`M0 ${y}H${box.width}`}
                  stroke={to}
                  strokeOpacity={0.1}
                />
              );
            })}
            {GALLERY_PANELS.map((panel) => (
              <rect
                key={panel.x}
                x={Math.round(panel.x * sx)}
                y={Math.round(panel.y * sy)}
                width={Math.round(panel.width * sx)}
                height={Math.round(panel.height * sy)}
                rx={3 * box.k}
                fill={panel.tone}
                opacity={0.14}
                stroke={panel.tone}
                strokeOpacity={0.35}
              />
            ))}
          </SceneLayer>
        );
      })}
    </>
  );
}
