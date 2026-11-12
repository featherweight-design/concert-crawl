'use client';

import { useEffect, useRef } from 'react';

import {
  CORE_RADIUS,
  HALO,
  TRAIL,
  trailOpacity,
} from '@/components/brand/cc-mark';
import { motionEase, runMotion } from '@/lib/motion';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';

// The CCMark trail laid flat (README rule 11): the mark's seven dots, radii and
// opacities, growing toward its core and halo. The timing is the handoff's
// fixed design values, not tokens; the easing is --motion-ease.
const LOOP_MS = 1300;
const FIRST_DOT_MS = 80;
const DOT_STEP_MS = 32;
const DOT_SWELL = 1.3;
const CORE_PULSE = 1.35;
const GAP = 6;

const DOT_RADII = TRAIL.map((dot) => dot.radius);
const HALO_OUTER = HALO[0].radius;

/** Dot i lights here, peaks pink half a step later and is blue as i+1 lights. */
const litAt = (i: number) => FIRST_DOT_MS + DOT_STEP_MS * i;
const LAND_MS = litAt(DOT_RADII.length);
const CORE_PINK_UNTIL_MS = LAND_MS + 96;
const CORE_BLUE_AT_MS = LAND_MS + 176;
const CORE_REST_AT_MS = LAND_MS + 336;

const at = (ms: number) => ms / LOOP_MS;

/** Every dot's x centre, laid end to end with GAP between edges. */
const DOT_X = DOT_RADII.reduce<number[]>((xs, radius, i) => {
  const prevEdge = i === 0 ? 0 : xs[i - 1]! + DOT_RADII[i - 1]! + GAP;
  xs.push(prevEdge + radius);
  return xs;
}, []);
const LAST_DOT_EDGE =
  DOT_X[DOT_X.length - 1]! + DOT_RADII[DOT_RADII.length - 1]! * DOT_SWELL;

/**
 * The box: room for the largest thing at the top of its bloom (the outer halo,
 * or the bare core when there is none), so nothing paints outside it.
 */
const geometry = (halo: boolean) => {
  const bloom = (halo ? HALO_OUTER : CORE_RADIUS) * CORE_PULSE;
  const coreX = LAST_DOT_EDGE + GAP + bloom;
  return { coreX, width: coreX + bloom, height: bloom * 2, midY: bloom };
};

const SCALES = { sm: 1, md: 2, lg: 4 } as const;
export type PinkWaveScale = keyof typeof SCALES;

const SWELL_STYLE = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
} as const;

/**
 * The B+ loader, reserved for waiting on shows: the launch, Browse's first load
 * and pull-to-refresh. Decorative; the caller's own text ("Loading shows")
 * carries the meaning. Under reduced motion it holds still on the mark's
 * resting frame: a blue trail and core inside the halo.
 */
export function PinkWave({
  scale = 'md',
  rest = false,
  halo = true,
}: {
  scale?: PinkWaveScale;
  /** Hold on the resting frame, as the pull zone does until it passes 74px. */
  rest?: boolean;
  /**
   * Draw the halo rings around the core. Browse's "Loading shows" line leaves
   * them out: `load_browse_d` ends the trail on the bare core, with no large
   * ringed dot after it.
   */
  halo?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced || rest;
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const haloRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const ease = motionEase();
    const loop = { duration: LOOP_MS, iterations: Infinity, easing: 'linear' };
    const blue = (offset: number, scaleBy = 1): Keyframe => ({
      offset,
      fill: 'var(--signal)',
      transform: `scale(${scaleBy})`,
      easing: ease,
    });
    const pink = (offset: number, scaleBy = 1): Keyframe => ({
      offset,
      fill: 'var(--accent)',
      transform: `scale(${scaleBy})`,
      easing: ease,
    });
    const running = [
      ...dotRefs.current.map((dot, i) =>
        runMotion(
          dot,
          [
            blue(0),
            blue(at(litAt(i))),
            pink(at(litAt(i) + DOT_STEP_MS / 2), DOT_SWELL),
            blue(at(litAt(i + 1))),
            blue(1),
          ],
          loop,
        ),
      ),
      runMotion(
        coreRef.current,
        [
          blue(0),
          blue(at(LAND_MS)),
          pink(at(LAND_MS + DOT_STEP_MS)),
          pink(at(CORE_PINK_UNTIL_MS)),
          blue(at(CORE_BLUE_AT_MS), CORE_PULSE),
          blue(at(CORE_REST_AT_MS)),
          blue(1),
        ],
        loop,
      ),
      ...haloRefs.current.map((ring) =>
        runMotion(
          ring,
          [
            { offset: 0, transform: 'scale(1)', easing: ease },
            {
              offset: at(CORE_PINK_UNTIL_MS),
              transform: 'scale(1)',
              easing: ease,
            },
            {
              offset: at(CORE_BLUE_AT_MS),
              transform: `scale(${CORE_PULSE})`,
              easing: ease,
            },
            { offset: at(CORE_REST_AT_MS), transform: 'scale(1)' },
            { offset: 1, transform: 'scale(1)' },
          ],
          loop,
        ),
      ),
    ];
    return () => {
      for (const animation of running) animation?.cancel();
    };
  }, [reduced, halo]);

  const factor = SCALES[scale];
  const { coreX, width, height, midY } = geometry(halo);
  return (
    <svg
      width={width * factor}
      height={height * factor}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      data-pink-wave={reduced ? 'still' : 'running'}
    >
      {(halo ? HALO : []).map((ring, i) => (
        <circle
          key={ring.radius}
          ref={(node) => {
            haloRefs.current[i] = node;
          }}
          data-part="halo"
          cx={coreX}
          cy={midY}
          r={ring.radius}
          fill="var(--accent)"
          opacity={ring.opacity}
          style={SWELL_STYLE}
        />
      ))}
      <circle
        ref={coreRef}
        data-part="core"
        cx={coreX}
        cy={midY}
        r={CORE_RADIUS}
        fill="var(--signal)"
        style={SWELL_STYLE}
      />
      {DOT_RADII.map((radius, i) => (
        <circle
          key={radius}
          ref={(node) => {
            dotRefs.current[i] = node;
          }}
          data-part="dot"
          cx={DOT_X[i]}
          cy={midY}
          r={radius}
          fill="var(--signal)"
          opacity={trailOpacity(i)}
          style={SWELL_STYLE}
        />
      ))}
    </svg>
  );
}
