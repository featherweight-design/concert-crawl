'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  TransitionEvent as ReactTransitionEvent,
} from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/** Finger travel below this is still a tap, so a close button keeps its click. */
export const DRAG_START_PX = 8;
/** Dragged this far down, the sheet goes whatever the speed. */
export const DISMISS_DISTANCE_PX = 110;
/** A short, quick flick goes too: at least this far, at this many px per ms. */
export const DISMISS_MIN_FLICK_PX = 36;
export const DISMISS_FLICK_SPEED = 0.6;

/** Where a release lands: past the distance, or a quick flick down. */
export const shouldDismiss = (distance: number, elapsedMs: number): boolean => {
  if (distance >= DISMISS_DISTANCE_PX) return true;
  if (distance < DISMISS_MIN_FLICK_PX) return false;
  return distance / Math.max(elapsedMs, 1) >= DISMISS_FLICK_SPEED;
};

// The sheet layout switches to a centred modal at 640px; only the bottom sheet
// is a drag-down surface.
const SHEET_QUERY = '(max-width: 639px)';

// Not `useMediaQuery`: that one calls `window.matchMedia` outright, and a sheet
// rendered where there is none (a jsdom test of a surface that merely contains a
// sheet) must stay a plain sheet rather than throw.
const useOnPhone = (): boolean => {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia?.(SHEET_QUERY);
    mql?.addEventListener?.('change', onChange);
    return () => mql?.removeEventListener?.('change', onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(SHEET_QUERY).matches ?? false,
    () => false,
  );
};

interface ActiveDrag {
  pointerId: number;
  startY: number;
  startedAt: number;
  moving: boolean;
}

type Phase = 'idle' | 'dragging' | 'settling';

interface SheetDrag {
  /** Spread on the grab zone: the handle strip or the sheet's header. */
  zoneProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    /**
     * The zone is small and not a scroller, so on a phone the finger is ours
     * there. From sm up the sheet is a modal and the zone is left alone.
     */
    style: CSSProperties;
  };
  /** Merge into the sheet's style: it follows the finger, then settles back. */
  sheetStyle: CSSProperties | undefined;
  /** Put on the sheet: ends the settle-back once its own transition is over. */
  onSheetTransitionEnd: (event: ReactTransitionEvent<HTMLElement>) => void;
}

export type SheetDragZone = SheetDrag['zoneProps'];

/**
 * Drag-down dismiss for a mobile bottom sheet, shared by every sheet shell.
 * Only a downward drag that starts in the grab zone moves the sheet, so the
 * sheet's own scrolling and taps are untouched. Past a distance, or on a quick
 * flick, it calls `onDismiss`; otherwise it settles back. With reduced motion
 * it still follows the finger but snaps back without animating.
 *
 * Pass `open` when the surface stays mounted while closed, so a close in the
 * middle of a drag or a settle never leaves the sheet pushed down on reopen.
 */
export function useSheetDrag(onDismiss: () => void, open = true): SheetDrag {
  const onPhone = useOnPhone();
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const active = useRef<ActiveDrag | null>(null);
  const offsetRef = useRef(0);

  const moveTo = useCallback((value: number) => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  const rest = useCallback(() => {
    active.current = null;
    setPhase('idle');
    moveTo(0);
  }, [moveTo]);

  useEffect(() => {
    if (!open) rest();
  }, [open, rest]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!onPhone) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      active.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startedAt: performance.now(),
        moving: false,
      };
    },
    [onPhone],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = active.current;
      if (drag === null || drag.pointerId !== event.pointerId) return;
      const distance = event.clientY - drag.startY;
      if (!drag.moving) {
        if (Math.abs(distance) < DRAG_START_PX) return;
        // Upward first: not a dismiss gesture, leave it alone.
        if (distance < 0) {
          active.current = null;
          return;
        }
        drag.moving = true;
        setPhase('dragging');
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      moveTo(Math.max(0, distance));
    },
    [moveTo],
  );

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
      const drag = active.current;
      if (drag === null || drag.pointerId !== event.pointerId) return;
      active.current = null;
      if (!drag.moving) return;
      const distance = event.clientY - drag.startY;
      const elapsed = performance.now() - drag.startedAt;
      if (!cancelled && shouldDismiss(distance, elapsed)) {
        onDismiss();
        rest();
        return;
      }
      // Nothing to animate back from (already at rest, or no motion allowed):
      // no transition would fire, so go straight to idle instead of settling.
      if (offsetRef.current === 0 || prefersReducedMotion()) {
        rest();
        return;
      }
      setPhase('settling');
      moveTo(0);
    },
    [onDismiss, rest, moveTo],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
    [finish],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
    [finish],
  );

  const onSheetTransitionEnd = useCallback(
    (event: ReactTransitionEvent<HTMLElement>) => {
      // Transitions bubble: a child's own (a day cell's hover, say) is not the
      // sheet's settle finishing.
      if (event.target !== event.currentTarget) return;
      setPhase((current) => (current === 'settling' ? 'idle' : current));
    },
    [],
  );

  return {
    zoneProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style: onPhone ? { touchAction: 'none' } : {},
    },
    sheetStyle:
      phase === 'idle'
        ? undefined
        : {
            transform: `translateY(${offset}px)`,
            transition:
              phase === 'dragging'
                ? 'none'
                : 'transform var(--motion-base) var(--motion-ease)',
          },
    onSheetTransitionEnd,
  };
}
