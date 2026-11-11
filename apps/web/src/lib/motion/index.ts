'use client';

// The Web Animations API home for B+ motion (plan: 2026-11-11-bplus-redesign,
// "Animation module"). CLAUDE.md bars new hand-rolled @keyframes in
// globals.css, and the global reduced-motion guard there only reaches CSS
// animations, so everything here checks reduced motion itself and reads its
// timing from the --motion-* tokens.

import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

export type MotionToken = 'fast' | 'base' | 'slow';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** The token values in globals.css, used when the stylesheet can't be read. */
const TOKEN_FALLBACK_MS: Record<MotionToken, number> = {
  fast: 140,
  base: 240,
  slow: 720,
};
const EASE_FALLBACK = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/** Parses a CSS time ("720ms", "0.72s") to milliseconds, or null. */
export function parseCssTimeMs(value: string): number | null {
  const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)\s*$/.exec(value);
  if (match === null) return null;
  const amount = Number(match[1]);
  return match[2] === 's' ? amount * 1000 : amount;
}

function readRootVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/** A --motion-* duration token in milliseconds. */
export function motionDurationMs(token: MotionToken): number {
  return (
    parseCssTimeMs(readRootVar(`--motion-${token}`)) ?? TOKEN_FALLBACK_MS[token]
  );
}

/** The --motion-ease easing. */
export function motionEase(): string {
  return readRootVar('--motion-ease') || EASE_FALLBACK;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/** Follows the reduced-motion setting, including changes while mounted. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

export interface MotionOptions {
  /** A token name, or milliseconds for a fixed design timeline. */
  duration: MotionToken | number;
  /** Defaults to --motion-ease. */
  easing?: string;
  iterations?: number;
  delay?: number;
  fill?: FillMode;
}

/**
 * Runs keyframes on an element with token timing. Returns null, and runs
 * nothing, under reduced motion or where the Web Animations API is missing
 * (SSR, older test DOMs). The caller renders its still frame in that case and
 * cancels the returned animation on unmount.
 */
export function runMotion(
  element: Element | null,
  keyframes: Keyframe[],
  options: MotionOptions,
): Animation | null {
  if (element === null || typeof element.animate !== 'function') return null;
  if (prefersReducedMotion()) return null;
  return element.animate(keyframes, {
    duration:
      typeof options.duration === 'number'
        ? options.duration
        : motionDurationMs(options.duration),
    easing: options.easing ?? motionEase(),
    iterations: options.iterations ?? 1,
    delay: options.delay ?? 0,
    fill: options.fill ?? 'none',
  });
}
