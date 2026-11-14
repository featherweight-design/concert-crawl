'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * The short-phone sheet rule (addendum 6 item 15), shared by every sheet
 * family: ModalShell, the filter sheets and the PWA bottom sheets.
 *
 * - The sheet stops 24px below the top of the screen; taller content scrolls
 *   inside it.
 * - A pinned footer is --surface-2 with a hairline on top, 12px above and 20px
 *   plus the safe area below, and a 22px fade above it while there is more.
 */

/** How far below the top of the screen a sheet stops. */
export const SHEET_TOP_GAP = 24;
/** The footer's padding: 12px above; 20px plus the safe area below. */
export const SHEET_FOOTER_PADDING =
  '12px 18px calc(20px + env(safe-area-inset-bottom))';
/** The fade above the pinned footer, tall enough to say "there is more". */
const FADE_HEIGHT = 22;

/**
 * Whether the scrolling body has been scrolled (a rail then draws a hairline
 * under it) and whether there is more below (the footer then draws a fade).
 * Watches size and content changes too, so a body that grows or shrinks after
 * a state change updates without a scroll. `remeasureKey` re-attaches the
 * observers when the body element is swapped for another.
 */
export function useScrollEdges(
  bodyRef: RefObject<HTMLElement | null>,
  active: boolean,
  remeasureKey: unknown = null,
) {
  const [edges, setEdges] = useState({ scrolled: false, more: false });

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (body === null) return;
    const scrolled = body.scrollTop > 0;
    const more = body.scrollHeight - body.scrollTop - body.clientHeight > 1;
    setEdges((prev) =>
      prev.scrolled === scrolled && prev.more === more
        ? prev
        : { scrolled, more },
    );
  }, [bodyRef]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!active) {
      // A sheet that stays mounted while closed reopens unscrolled.
      setEdges((prev) =>
        prev.scrolled || prev.more ? { scrolled: false, more: false } : prev,
      );
      return;
    }
    if (body === null) return;
    measure();
    const observers: Array<{ disconnect: () => void }> = [];
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(measure);
      resize.observe(body);
      // At the cap the body's own box stops changing; its content does not.
      for (const child of Array.from(body.children)) resize.observe(child);
      observers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutation = new MutationObserver(measure);
      mutation.observe(body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observers.push(mutation);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, [active, remeasureKey, measure, bodyRef]);

  return { edges, measure };
}

/**
 * The 22px fade over the bottom of a scrolling body, drawn while there is more
 * below. Place it inside the body's `position: relative` wrapper, after the
 * body, and only when a pinned footer sits under it. `panel` is the sheet's
 * background colour.
 */
export function ScrollFade({ show, panel }: { show: boolean; panel: string }) {
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="modal-fade"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FADE_HEIGHT,
        pointerEvents: 'none',
        background: `linear-gradient(to bottom, transparent, ${panel})`,
      }}
    />
  );
}
