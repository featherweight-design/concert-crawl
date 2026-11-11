'use client';

import { useEffect, useRef } from 'react';

import { runMotion, useReducedMotion } from '@/lib/motion';

// The CCMark trail laid flat (README rule 11): seven dots growing toward a core
// with a halo. These are fixed design values from the handoff, not tokens.
const LOOP_MS = 1300;
const FIRST_DOT_MS = 80;
const DOT_STEP_MS = 32;
const DOT_SWELL = 1.3;
const CORE_PULSE = 1.35;
/** The trail radii from CCMark, smallest first. */
const DOT_RADII = [1.5, 2, 2.5, 3, 4, 5, 6] as const;
const CORE_RADIUS = 7;
const HALO_RADIUS = 12;
const GAP = 6;

const LAND_MS = FIRST_DOT_MS + DOT_STEP_MS * DOT_RADII.length;
const CORE_PINK_UNTIL_MS = LAND_MS + 96;
const CORE_BLUE_AT_MS = LAND_MS + 176;
const CORE_REST_AT_MS = LAND_MS + 336;

const at = (ms: number) => ms / LOOP_MS;

/** Every dot's x centre, laid end to end with GAP between edges. */
const DOT_X = DOT_RADII.reduce<number[]>((xs, radius, i) => {
  const prev = i === 0 ? 0 : xs[i - 1]! + DOT_RADII[i - 1]!;
  xs.push(prev + (i === 0 ? radius : GAP + radius));
  return xs;
}, []);
const CORE_X =
  DOT_X[DOT_X.length - 1]! +
  DOT_RADII[DOT_RADII.length - 1]! +
  GAP +
  HALO_RADIUS -
  (HALO_RADIUS - CORE_RADIUS);
const WIDTH = CORE_X + HALO_RADIUS;
const HEIGHT = HALO_RADIUS * 2;
const MID_Y = HALO_RADIUS;

const SCALES = { sm: 1, md: 2, lg: 4 } as const;
export type PinkWaveScale = keyof typeof SCALES;

const SWELL_STYLE = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
} as const;

/**
 * The B+ loader, reserved for waiting on shows: the launch, Browse's first load
 * and pull-to-refresh. Decorative; the caller's own text ("Loading shows")
 * carries the meaning. Under reduced motion it holds still on the blue frame.
 */
export function PinkWave({ scale = 'md' }: { scale?: PinkWaveScale }) {
  const reduced = useReducedMotion();
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const loop = { duration: LOOP_MS, iterations: Infinity, easing: 'linear' };
    const running = [
      ...dotRefs.current.map((dot, i) => {
        const lit = FIRST_DOT_MS + DOT_STEP_MS * i;
        return runMotion(
          dot,
          [
            { offset: 0, fill: 'var(--signal)', transform: 'scale(1)' },
            { offset: at(lit), fill: 'var(--signal)', transform: 'scale(1)' },
            {
              offset: at(lit + DOT_STEP_MS),
              fill: 'var(--accent)',
              transform: `scale(${DOT_SWELL})`,
            },
            {
              offset: at(lit + DOT_STEP_MS * 2),
              fill: 'var(--signal)',
              transform: 'scale(1)',
            },
            { offset: 1, fill: 'var(--signal)', transform: 'scale(1)' },
          ],
          loop,
        );
      }),
      runMotion(
        coreRef.current,
        [
          { offset: 0, fill: 'var(--signal)', transform: 'scale(1)' },
          { offset: at(LAND_MS), fill: 'var(--signal)', transform: 'scale(1)' },
          {
            offset: at(LAND_MS + DOT_STEP_MS),
            fill: 'var(--accent)',
            transform: 'scale(1)',
          },
          {
            offset: at(CORE_PINK_UNTIL_MS),
            fill: 'var(--accent)',
            transform: 'scale(1)',
          },
          {
            offset: at(CORE_BLUE_AT_MS),
            fill: 'var(--signal)',
            transform: `scale(${CORE_PULSE})`,
          },
          {
            offset: at(CORE_REST_AT_MS),
            fill: 'var(--signal)',
            transform: 'scale(1)',
          },
          { offset: 1, fill: 'var(--signal)', transform: 'scale(1)' },
        ],
        loop,
      ),
      runMotion(
        haloRef.current,
        [
          { offset: 0, opacity: 0.22, transform: 'scale(1)' },
          {
            offset: at(CORE_PINK_UNTIL_MS),
            opacity: 0.22,
            transform: 'scale(1)',
          },
          {
            offset: at(CORE_BLUE_AT_MS),
            opacity: 0.42,
            transform: `scale(${CORE_PULSE})`,
          },
          {
            offset: at(CORE_REST_AT_MS),
            opacity: 0.22,
            transform: 'scale(1)',
          },
          { offset: 1, opacity: 0.22, transform: 'scale(1)' },
        ],
        loop,
      ),
    ];
    return () => {
      for (const animation of running) animation?.cancel();
    };
  }, [reduced]);

  const factor = SCALES[scale];
  return (
    <svg
      width={WIDTH * factor}
      height={HEIGHT * factor}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      data-pink-wave={reduced ? 'still' : 'running'}
      style={{ overflow: 'visible' }}
    >
      <circle
        ref={haloRef}
        cx={CORE_X}
        cy={MID_Y}
        r={HALO_RADIUS}
        fill="var(--signal)"
        opacity={0.22}
        style={SWELL_STYLE}
      />
      <circle
        ref={coreRef}
        cx={CORE_X}
        cy={MID_Y}
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
          cx={DOT_X[i]}
          cy={MID_Y}
          r={radius}
          fill="var(--signal)"
          opacity={0.35 + i * 0.09}
          style={SWELL_STYLE}
        />
      ))}
    </svg>
  );
}
