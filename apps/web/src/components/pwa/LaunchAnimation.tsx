'use client';

import { useEffect } from 'react';
import {
  CORE,
  CORE_RADIUS,
  HALO,
  TRAIL,
  trailOpacity,
} from '@/components/brand/cc-mark';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { LAUNCH_MS, endLaunch, markLaunchPlayed } from '@/lib/pwa/launch';
import {
  PWA_ICON_PALETTE,
  PWA_SPLASH_BACKGROUND,
  STARTUP_TILE_CSS_PX,
  STARTUP_TILE_RADIUS_CSS_PX,
} from '@/app/api/pwa/icon-svg';
import { LAUNCH_COPY } from './definitions/copy';
import './launch.css';

// The launch animation (B+ README rule 12, boards `bp-s-launch_*`). It plays on
// a cold start of the installed app, drawn over the page, which keeps loading
// underneath: the overlay takes no pointer events and goes by itself, so it can
// never hold the app. The decision is the head script's (`LAUNCH_DETECT`) and
// the motion is `launch.css`; this component is the server-rendered markup
// those two act on, shown only while `<html data-launch>` is set, and the one
// place that records the launch as played.

const SPLASH_BG = PWA_SPLASH_BACKGROUND;
const TILE_BG = PWA_ICON_PALETTE.background;
// The splash ground is fixed, so its ink is fixed too: on the Light theme the
// theme tokens would put dark wordmark ink on this dark ground.
const INK_LEAD = '#E8F3FF'; // fwd-allow-hex: board art colour
const INK_ACCENT = '#FF7BD4'; // fwd-allow-hex: board art colour
const INK_SIGNAL = '#7AE6FF'; // fwd-allow-hex: board art colour
// Not drawn as a token on the board; read off bp-s-launch_k740_m.jpg.
const INK_SUBTLE = '#5B6488'; // fwd-allow-hex: board art colour
/** The core bloom: about 330px across, centred on the core (k740, k950). */
const BLOOM_PX = 330;
// INK_ACCENT (#FF7BD4) at 35% and 0%, written out rather than built by
// concatenating hex alpha onto the colour.
const BLOOM_CENTRE = 'rgba(255, 123, 212, 0.35)';
const BLOOM_EDGE = 'rgba(255, 123, 212, 0)';
const TILE_PX = STARTUP_TILE_CSS_PX;
/** The mark's art is 96 units; its box at scale 1 is that 96px. */
const MARK_PX = 96;
/** The full-size mark, and where the wordmark sits under it. */
const FULL_SCALE = 4.2;
// Safety net: the overlay stops showing even if its animation never reports an
// end (a late hydration misses the event).
const FAILSAFE_MS = LAUNCH_MS.total + 1500;

export function LaunchAnimation() {
  useEffect(() => {
    markLaunchPlayed();
    const failsafe = window.setTimeout(endLaunch, FAILSAFE_MS);
    return () => window.clearTimeout(failsafe);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="launch-animation"
      className="launch-loader"
      style={{ background: SPLASH_BG }}
      // Only the overlay's own animation ends it: the children's `animationend`
      // bubbles up and must not.
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) endLaunch();
      }}
    >
      <div
        className="ll-tile"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: TILE_PX,
          height: TILE_PX,
          borderRadius: STARTUP_TILE_RADIUS_CSS_PX,
          background: TILE_BG,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="ll-bloom"
        data-testid="launch-bloom"
        style={{
          position: 'absolute',
          width: BLOOM_PX,
          height: BLOOM_PX,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BLOOM_CENTRE} 0%, ${BLOOM_EDGE} 70%)`,
          opacity: 0,
        }}
      />
      <div
        className="ll-mark"
        data-testid="launch-mark"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: MARK_PX,
          height: MARK_PX,
          // Top-left origin, as the board's source has it: the keyframes
          // translate the box's corner.
          transformOrigin: '0 0',
        }}
      >
        <svg
          width={MARK_PX}
          height={MARK_PX}
          viewBox="0 0 96 96"
          focusable="false"
          style={{ overflow: 'visible' }}
        >
          {HALO.map((ring) => (
            <circle
              key={ring.radius}
              className="ll-halo"
              {...CORE}
              r={ring.radius}
              fill={INK_ACCENT}
              opacity={ring.opacity}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}
          <circle
            className="ll-core"
            {...CORE}
            r={CORE_RADIUS}
            style={{
              fill: INK_SIGNAL,
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
          />
          {TRAIL.map((dot, index) => (
            <circle
              key={index}
              className="ll-dot"
              cx={dot.cx}
              cy={dot.cy}
              r={dot.radius}
              opacity={trailOpacity(index)}
              style={{
                fill: INK_SIGNAL,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                // Pink travels up the trail a dot at a time.
                animationDelay: `${LAUNCH_MS.trailStart + LAUNCH_MS.trailStep * index}ms`,
              }}
            />
          ))}
        </svg>
      </div>
      <div
        className="ll-word"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `calc(50% + ${(MARK_PX * FULL_SCALE) / 2 + 24}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          opacity: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: '-0.025em',
            color: INK_LEAD,
            lineHeight: 1,
          }}
        >
          {BRAND_COPY.wordmark.lead}
          <span style={{ color: INK_ACCENT }}>
            {BRAND_COPY.wordmark.accent}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.4em',
            color: INK_SUBTLE,
          }}
        >
          {LAUNCH_COPY.place}
        </span>
      </div>
    </div>
  );
}
