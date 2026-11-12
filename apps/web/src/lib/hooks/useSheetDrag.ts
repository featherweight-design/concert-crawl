'use client';

import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
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

interface ActiveDrag {
  pointerId: number;
  startY: number;
  startedAt: number;
  moving: boolean;
}

type Phase = 'idle' | 'dragging' | 'settling';

export type SheetDragZone = SheetDrag['zoneProps'];

interface SheetDrag {
  /** Spread on the grab zone: the handle strip or the sheet's header. */
  zoneProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    /** The zone is small and not a scroller, so the finger is ours there. */
    style: CSSProperties;
  };
  /** Merge into the sheet's style: it follows the finger, then settles back. */
  sheetStyle: CSSProperties | undefined;
  /** Put on the sheet: ends the settle-back once its transition is over. */
  onSheetTransitionEnd: () => void;
}

/**
 * Drag-down dismiss for a mobile bottom sheet, shared by every sheet shell.
 * Only a downward drag that starts in the grab zone moves the sheet, so the
 * sheet's own scrolling and taps are untouched. Past a distance, or on a quick
 * flick, it calls `onDismiss`; otherwise it settles back. With reduced motion
 * it still follows the finger but snaps back without animating.
 */
export function useSheetDrag(onDismiss: () => void): SheetDrag {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const active = useRef<ActiveDrag | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!window.matchMedia?.(SHEET_QUERY).matches) return;
    active.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startedAt: performance.now(),
      moving: false,
    };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
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
    setOffset(Math.max(0, distance));
  }, []);

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
        setPhase('idle');
        setOffset(0);
        return;
      }
      if (prefersReducedMotion()) {
        setPhase('idle');
        setOffset(0);
        return;
      }
      setPhase('settling');
      setOffset(0);
    },
    [onDismiss],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
    [finish],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
    [finish],
  );

  const onSheetTransitionEnd = useCallback(() => {
    setPhase((current) => (current === 'settling' ? 'idle' : current));
  }, []);

  return {
    zoneProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style: { touchAction: 'none' },
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
