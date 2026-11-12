'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CORE,
  CORE_RADIUS,
  HALO,
  TRAIL,
  trailOpacity,
} from '@/components/brand/cc-mark';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { prefersReducedMotion, runMotion } from '@/lib/motion';
import {
  LAUNCH_FLAG_KEY,
  LAUNCH_LANDING,
  LAUNCH_MS,
  LAUNCH_PLAYED_KEY,
  isStandaloneDisplay,
  readStored,
  shouldPlayLaunch,
  writeStored,
} from '@/lib/pwa/launch';
import { LAUNCH_COPY } from './definitions/copy';

// The launch animation (B+ README rule 12, boards `bp-s-launch_*`). It plays on
// a cold start of the installed app, drawn over the page, which keeps loading
// underneath: the overlay takes no pointer events and removes itself, so it can
// never hold the app. Timing is the handoff's fixed timeline (`LAUNCH_MS`);
// every animation is the Web Animations API through `runMotion`, never
// @keyframes.

const SPLASH_BG = '#070A1A';
const TILE_BG = '#171D3A';
const TILE_PX = 128;
/** The mark's art is 96 units; its box at scale 1 is that 96px. */
const MARK_PX = 96;
/** The header logo's box, where the mark lands. */
const LANDING_PX = LAUNCH_LANDING.size;
/** Starts at 128 / 96, the splash tile's size, centred (addendum 2 item 22). */
const START_SCALE = TILE_PX / MARK_PX;
const FULL_SCALE = 4.2;
const SWELL = 1.28;
const CORE_PULSE = 1.4;
const HALO_BLOOM = 1.2;
const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
// Safety net: the overlay is gone even if an animation never reports finished.
const FAILSAFE_MS = LAUNCH_MS.total + 1500;

const at = (ms: number) => ms / LAUNCH_MS.total;

export function LaunchAnimation() {
  const { enabled, loaded } = useFeatureFlag('launch-animation');
  const [playing, setPlaying] = useState(false);

  // The cold-start decision, once, on mount, from what is already on the device.
  useEffect(() => {
    const standalone = isStandaloneDisplay();
    const alreadyPlayed = readStored('session', LAUNCH_PLAYED_KEY) !== null;
    // Marked in standalone whether or not it plays, so a later navigation or
    // remount in the same session is never mistaken for a cold start.
    if (standalone) writeStored('session', LAUNCH_PLAYED_KEY, '1');
    if (
      shouldPlayLaunch({
        standalone,
        alreadyPlayed,
        flagCached: readStored('local', LAUNCH_FLAG_KEY) === '1',
        reducedMotion: prefersReducedMotion(),
      })
    ) {
      setPlaying(true);
    }
  }, []);

  // Declared after the decision effect on purpose: effects run in order, and the
  // decision must read the PREVIOUS start's cached answer before this one
  // overwrites it.
  // Remember the flag's answer for the next cold start. Only once the fetch
  // has really returned data: neither the registry default before it nor the
  // fallback after a failed one (offline cold start) may overwrite it.
  useEffect(() => {
    if (loaded) writeStored('local', LAUNCH_FLAG_KEY, enabled ? '1' : '0');
  }, [enabled, loaded]);

  return playing ? <LaunchStage onDone={() => setPlaying(false)} /> : null;
}

function LaunchStage({ onDone }: { onDone: () => void }) {
  // Held in a ref so a parent re-render can never restart the timeline.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const rootRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement>(null);
  const haloRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const total = LAUNCH_MS.total;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Where the mark lands: the header logo's spot, measured from the centre.
    const landX = LAUNCH_LANDING.left + LANDING_PX / 2 - vw / 2;
    const landY = LAUNCH_LANDING.top + LANDING_PX / 2 - vh / 2;
    const centred = (scale: number) => `translate(0px, 0px) scale(${scale})`;
    const animations: (Animation | null)[] = [];
    let cancelled = false;
    const run = (
      element: Element | null,
      keyframes: Keyframe[],
      easing = 'linear',
    ) =>
      animations.push(
        runMotion(element, keyframes, {
          duration: total,
          easing,
          fill: 'forwards',
        }),
      );

    // Frame 0 is the system splash: the tile alone. It fades as the mark grows.
    run(tileRef.current, [
      { offset: 0, opacity: 1 },
      { offset: at(LAUNCH_MS.tileFadeEnd), opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    // The mark: small, grows to 4.2× (expo out), holds, then shrinks into the
    // header logo's spot.
    run(markRef.current, [
      { offset: 0, transform: centred(START_SCALE), opacity: 1 },
      {
        offset: at(LAUNCH_MS.growStart),
        transform: centred(START_SCALE),
        // WAAPI applies a keyframe's easing to the segment that STARTS there.
        easing: EXPO_OUT,
      },
      { offset: at(LAUNCH_MS.growEnd), transform: centred(FULL_SCALE) },
      { offset: at(LAUNCH_MS.shrinkStart), transform: centred(FULL_SCALE) },
      {
        offset: 1,
        transform: `translate(${landX}px, ${landY}px) scale(${LANDING_PX / MARK_PX})`,
      },
    ]);

    // Pink travels up the trail a dot at a time, each back to blue as the next
    // lights; the core catches it last, fades to blue, then pulses.
    dotRefs.current.forEach((dot, index) => {
      const litAt = LAUNCH_MS.trailStart + LAUNCH_MS.trailStep * index;
      run(dot, [
        { offset: 0, fill: 'var(--signal)', transform: 'scale(1)' },
        { offset: at(litAt), fill: 'var(--signal)', transform: 'scale(1)' },
        {
          offset: at(litAt + LAUNCH_MS.trailStep),
          fill: 'var(--accent)',
          transform: `scale(${SWELL})`,
        },
        {
          offset: at(litAt + LAUNCH_MS.trailStep * 2),
          fill: 'var(--signal)',
          transform: 'scale(1)',
        },
        { offset: 1, fill: 'var(--signal)', transform: 'scale(1)' },
      ]);
    });
    const landed = LAUNCH_MS.trailStart + LAUNCH_MS.trailStep * TRAIL.length;
    run(coreRef.current, [
      { offset: 0, fill: 'var(--signal)', transform: 'scale(1)' },
      { offset: at(landed), fill: 'var(--signal)', transform: 'scale(1)' },
      { offset: at(landed + LAUNCH_MS.trailStep), fill: 'var(--accent)' },
      { offset: at(LAUNCH_MS.trailEnd), fill: 'var(--accent)' },
      {
        offset: at(LAUNCH_MS.coreBlueEnd),
        fill: 'var(--signal)',
        transform: 'scale(1)',
      },
      {
        offset: at((LAUNCH_MS.pulseStart + LAUNCH_MS.pulseEnd) / 2),
        fill: 'var(--signal)',
        transform: `scale(${CORE_PULSE})`,
      },
      {
        offset: at(LAUNCH_MS.pulseEnd),
        fill: 'var(--signal)',
        transform: 'scale(1)',
      },
      { offset: 1, fill: 'var(--signal)', transform: 'scale(1)' },
    ]);
    haloRefs.current.forEach((ring) =>
      run(ring, [
        { offset: 0, transform: 'scale(1)' },
        { offset: at(LAUNCH_MS.pulseStart), transform: 'scale(1)' },
        {
          offset: at((LAUNCH_MS.pulseStart + LAUNCH_MS.pulseEnd) / 2),
          transform: `scale(${HALO_BLOOM})`,
        },
        { offset: at(LAUNCH_MS.pulseEnd), transform: 'scale(1)' },
        { offset: 1, transform: 'scale(1)' },
      ]),
    );

    // The wordmark and DENVER rise in, then leave as the mark shrinks away.
    run(wordRef.current, [
      { offset: 0, opacity: 0, transform: 'translateY(14px)' },
      {
        offset: at(LAUNCH_MS.wordStart),
        opacity: 0,
        transform: 'translateY(14px)',
        easing: EXPO_OUT,
      },
      {
        offset: at(LAUNCH_MS.wordEnd),
        opacity: 1,
        transform: 'translateY(0px)',
      },
      {
        offset: at(LAUNCH_MS.shrinkStart),
        opacity: 1,
        transform: 'translateY(0px)',
      },
      { offset: 1, opacity: 0, transform: 'translateY(0px)' },
    ]);

    // The backdrop fades through the hand-off, so the page beneath is what
    // the mark lands on.
    const backdrop = runMotion(
      rootRef.current,
      [
        { offset: 0, opacity: 1 },
        { offset: at(LAUNCH_MS.shrinkStart), opacity: 1 },
        { offset: 1, opacity: 0 },
      ],
      { duration: total, easing: 'linear', fill: 'forwards' },
    );
    animations.push(backdrop);
    // No Web Animations support (or reduced motion racing the effect): there is
    // nothing to wait for, so the opaque overlay must not sit over the app.
    if (backdrop === null) doneRef.current();
    else {
      // Only a real finish ends it: a cancel (effect cleanup, StrictMode's
      // dev remount) rejects `finished` and must not dismiss the overlay.
      void backdrop.finished.then(
        () => {
          if (!cancelled) doneRef.current();
        },
        () => undefined,
      );
    }

    const failsafe = window.setTimeout(() => doneRef.current(), FAILSAFE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      animations.forEach((animation) => animation?.cancel());
    };
  }, []);

  const centre = `translate(-50%, -50%)`;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-testid="launch-animation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: SPLASH_BG,
        // Never holds the app: taps reach the page beneath.
        pointerEvents: 'none',
      }}
    >
      <div
        ref={tileRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: TILE_PX,
          height: TILE_PX,
          borderRadius: 28,
          background: TILE_BG,
          transform: centre,
        }}
      />
      <div
        ref={markRef}
        data-testid="launch-mark"
        style={{
          position: 'absolute',
          left: `calc(50% - ${MARK_PX / 2}px)`,
          top: `calc(50% - ${MARK_PX / 2}px)`,
          width: MARK_PX,
          height: MARK_PX,
          transform: `scale(${START_SCALE})`,
          transformOrigin: 'center',
        }}
      >
        <svg
          width={MARK_PX}
          height={MARK_PX}
          viewBox="0 0 96 96"
          focusable="false"
          style={{ overflow: 'visible' }}
        >
          {HALO.map((ring, index) => (
            <circle
              key={ring.radius}
              ref={(node) => {
                haloRefs.current[index] = node;
              }}
              {...CORE}
              r={ring.radius}
              fill="var(--accent)"
              opacity={ring.opacity}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}
          <circle
            ref={coreRef}
            {...CORE}
            r={CORE_RADIUS}
            style={{
              fill: 'var(--signal)',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
          />
          {TRAIL.map((dot, index) => (
            <circle
              key={index}
              ref={(node) => {
                dotRefs.current[index] = node;
              }}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.radius}
              opacity={trailOpacity(index)}
              style={{
                fill: 'var(--signal)',
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            />
          ))}
        </svg>
      </div>
      <div
        ref={wordRef}
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
            color: 'var(--fg)',
            lineHeight: 1,
          }}
        >
          {BRAND_COPY.wordmark.lead}
          <span style={{ color: 'var(--accent)' }}>
            {BRAND_COPY.wordmark.accent}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.4em',
            color: 'var(--fg-subtle)',
          }}
        >
          {LAUNCH_COPY.place}
        </span>
      </div>
    </div>
  );
}
