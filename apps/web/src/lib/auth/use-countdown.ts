'use client';

import { useCallback, useEffect, useState } from 'react';

/** "1:05" for 65 seconds. */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/**
 * A whole-second countdown. `start(n)` begins n seconds; `remaining` reads 0
 * once it is over (or before it began). Serves the resend wait and the
 * rate-limit wait.
 */
export function useCountdown(): {
  remaining: number;
  start: (seconds: number) => void;
} {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setEndsAt(null);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    setEndsAt(Date.now() + seconds * 1000);
    setRemaining(seconds);
  }, []);

  return { remaining, start };
}
