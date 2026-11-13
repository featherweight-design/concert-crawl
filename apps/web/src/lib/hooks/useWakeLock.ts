'use client';

import { useEffect } from 'react';

/**
 * Keeps the screen awake while `active`, where the browser has the Screen Wake
 * Lock API. Where it does not, or the request is refused (a low battery, a
 * hidden tab), nothing happens: this is a nicety, never a requirement.
 *
 * The browser releases the lock whenever the page is hidden, so it is asked for
 * again when the page comes back, whether or not an earlier request ever
 * landed. At most one request is in flight and at most one lock is held. It is
 * given back on `active` going false and on unmount.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let cancelled = false;

    const request = async () => {
      if (pending || (sentinel !== null && !sentinel.released)) return;
      pending = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release().catch(() => undefined);
          return;
        }
        sentinel = lock;
      } catch {
        // Refused: the screen sleeps on its own timer, as it would anyway.
      } finally {
        pending = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}
