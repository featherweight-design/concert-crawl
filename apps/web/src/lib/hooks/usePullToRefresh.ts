'use client';

import { useEffect, useRef, useState } from 'react';

/** The indicator height, after resistance, at which a release commits. */
export const PULL_READY_PX = 74;
/** The indicator never opens wider than this, however far the finger goes. */
export const PULL_MAX_PX = 120;
const RESISTANCE = 0.5;

/** Finger travel to indicator height: halved, then capped. */
export const pullDistance = (fingerDelta: number): number =>
  Math.min(PULL_MAX_PX, Math.max(0, fingerDelta) * RESISTANCE);

export type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

interface PullToRefresh {
  /** Indicator height in px: the pull while dragging, the ready height while busy. */
  height: number;
  state: PullState;
}

/**
 * Pull-to-refresh for the page itself: a downward drag that starts with the
 * page scrolled to the top. Touch only, so it never fights a mouse or trackpad.
 * `onRefresh` resolves when the new data is in; the indicator holds until then.
 *
 * `touchmove` is registered non-passive and cancels the browser's own
 * overscroll only while a pull is under way, so ordinary scrolling is never
 * blocked.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
): PullToRefresh {
  const [height, setHeight] = useState(0);
  const [state, setState] = useState<PullState>('idle');
  const startY = useRef<number | null>(null);
  const stateRef = useRef<PullState>('idle');
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const set = (next: PullState, nextHeight: number) => {
      stateRef.current = next;
      setState(next);
      setHeight(nextHeight);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch === undefined || stateRef.current === 'refreshing') return;
      startY.current = window.scrollY <= 0 ? touch.clientY : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch === undefined || startY.current === null) return;
      if (stateRef.current === 'refreshing') return;
      const delta = touch.clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        if (stateRef.current !== 'idle') set('idle', 0);
        return;
      }
      if (event.cancelable) event.preventDefault();
      const next = pullDistance(delta);
      set(next >= PULL_READY_PX ? 'ready' : 'pulling', next);
    };

    const onTouchEnd = () => {
      const was = stateRef.current;
      startY.current = null;
      if (was !== 'ready') {
        if (was !== 'idle') set('idle', 0);
        return;
      }
      set('refreshing', PULL_READY_PX);
      void refreshRef
        .current()
        .catch(() => undefined)
        .finally(() => set('idle', 0));
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return { height, state };
}
