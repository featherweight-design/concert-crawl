'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { PinkWave } from './PinkWave';
import { PINK_WAVE_COPY } from './definitions/copy';

// A refresh holds the wave for at least one full loop (1300ms) so it never
// flashes, and then until the fetch settles.
const MIN_REFRESH_MS = 1300;
const CLOSE_BACKSTOP_MS = 400;

/**
 * Pull-to-refresh for Browse (B+ `bp-s-pull_m`): drag the page down from the
 * top and the pink wave and "Loading shows" open above the list while the
 * events reload. The pink wave is reserved for waiting on shows (README rule
 * 10), which this is. Render it as the first child of the page body: it takes
 * no space until a pull begins, then pushes the content down.
 */
export function PullToRefresh() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();

  const refresh = useCallback(async () => {
    const floor = new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS));
    // The server-rendered first page and the client's loaded pages are two
    // sources of the same list; ask for both. `router.refresh()` returns
    // nothing to wait on, so only the client reload and the floor hold the
    // indicator.
    router.refresh();
    try {
      await Promise.all([
        queryClient.refetchQueries(
          { queryKey: ['events'] },
          { throwOnError: true },
        ),
        floor,
      ]);
    } catch {
      // A failed pull used to close silently, as if it had worked. One toast
      // at a time: a second failed pull replaces the first.
      toast.error(PINK_WAVE_COPY.refreshFailed, { id: 'pull-refresh' });
    }
  }, [router, queryClient]);

  const { height, state } = usePullToRefresh(refresh);
  // Letting go short of the threshold snaps back on --motion-fast; a refresh
  // that has finished closes on --motion-base. The zone stays mounted while it
  // collapses so the height can animate.
  const [seen, setSeen] = useState(state);
  const [closing, setClosing] = useState<'fast' | 'base' | null>(null);
  // Derived during render, so the zone never unmounts between the release and
  // its collapse (an unmounted zone has no height to animate from).
  if (seen !== state) {
    setSeen(state);
    if (state !== 'idle') setClosing(null);
    else if (!reduced) setClosing(seen === 'refreshing' ? 'base' : 'fast');
  }
  useEffect(() => {
    if (closing === null) return;
    // Backstop for a collapse that has no height change to end on.
    const timer = setTimeout(() => setClosing(null), CLOSE_BACKSTOP_MS);
    return () => clearTimeout(timer);
  }, [closing]);
  if (state === 'idle' && height === 0 && closing === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={PINK_WAVE_COPY.loadingShows}
      data-state={state}
      onTransitionEnd={() => {
        if (state === 'idle') setClosing(null);
      }}
      style={{
        height,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        // Follows the finger while dragging; eases back on release.
        transition:
          state === 'pulling' || state === 'ready' || reduced
            ? 'none'
            : `height ${closing === 'fast' ? 'var(--motion-fast)' : 'var(--motion-base)'} var(--motion-ease)`,
      }}
    >
      <PinkWave scale="sm" rest={state === 'pulling'} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {PINK_WAVE_COPY.loadingShows}
      </span>
    </div>
  );
}
