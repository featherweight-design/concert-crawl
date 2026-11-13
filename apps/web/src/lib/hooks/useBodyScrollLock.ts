'use client';

import { useEffect } from 'react';

/**
 * The one page scroll lock every modal surface shares. The app scrolls the
 * window, so an open sheet or dialog must stop the page behind it from
 * scrolling under a finger or a wheel.
 *
 * Ref counted: a sheet opened from another sheet takes a second lock, and the
 * page unlocks only when the last one releases. The styles the first lock
 * found are what the last release puts back, so a surface never restores
 * another surface's `hidden` as if it were the page's own value.
 *
 * `overflow: hidden` on both `<html>` and `<body>` keeps the scroll offset
 * where it was (no `position: fixed` jump). If the offset still moved while
 * locked, the last release puts it back, but only on the same URL: a row in a
 * sheet that navigates must leave the new page at its own top.
 */

interface SavedPage {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
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
    // Measured before hiding the overflow: once hidden, the scrollbar is gone
    // and the page would widen under the dialog on a desktop with a gutter.
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    saved = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      scrollY: window.scrollY,
      href: window.location.href,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
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
    body.style.paddingRight = page.bodyPaddingRight;
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
