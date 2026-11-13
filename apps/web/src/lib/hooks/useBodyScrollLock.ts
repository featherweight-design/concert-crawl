'use client';

import { useEffect } from 'react';

/**
 * The one page scroll lock every modal surface shares. The app scrolls the
 * window, so an open sheet or dialog, or a full-viewport scrim, must stop the
 * page behind it from scrolling under a finger or a wheel.
 *
 * Ref counted: a sheet opened from another sheet takes a second lock, and the
 * page unlocks only when the last one releases. The styles the first lock
 * found are what the last release puts back, so a surface never restores
 * another surface's `hidden` as if it were the page's own value.
 *
 * `overflow: hidden` on both `<html>` and `<body>` keeps the scroll offset
 * where it was (no `position: fixed` hack); iOS honours it from 16, the
 * supported floor. `<html>` carries `scrollbar-gutter: stable` (globals.css),
 * so a desktop scrollbar's disappearance does not widen the page under the
 * dialog. The surfaces' own scroll areas carry `overscroll-behavior: contain`
 * (globals.css) so a fling at their end does not chain to the page.
 *
 * If the offset still moved while locked, the last release puts it back, but
 * only on the same URL: a row in a sheet that navigates must leave the new
 * page at its own top.
 */

interface SavedPage {
  htmlOverflow: string;
  bodyOverflow: string;
  scrollY: number;
  href: string;
}

let lockCount = 0;
let saved: SavedPage | null = null;

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  const html = document.documentElement;
  const { body } = document;

  lockCount += 1;
  if (lockCount === 1) {
    saved = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      scrollY: window.scrollY,
      href: window.location.href,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }

  let released = false;
  return () => {
    // Idempotent per lock, so a double cleanup cannot steal another
    // surface's count.
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0 || saved === null) return;
    const page = saved;
    saved = null;
    html.style.overflow = page.htmlOverflow;
    body.style.overflow = page.bodyOverflow;
    if (window.location.href === page.href && window.scrollY !== page.scrollY) {
      window.scrollTo(0, page.scrollY);
    }
  };
}

/** Holds the page scroll lock while `active` is true. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return lockBodyScroll();
  }, [active]);
}

/** Test-only: the number of locks currently held. */
export function bodyScrollLockCount(): number {
  return lockCount;
}

/**
 * Test-only: drop every lock and the saved page, so one test's leaked lock
 * cannot leak into the next. Leaves the element styles to the test.
 */
export function resetBodyScrollLockForTests(): void {
  lockCount = 0;
  saved = null;
}
