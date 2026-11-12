'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';
import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import { PinkWave } from './PinkWave';
import { PINK_WAVE_COPY } from './definitions/copy';

// A refresh that returns instantly still shows the wave for a beat, so the
// pull reads as having done something.
const MIN_REFRESH_MS = 600;

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
    // sources of the same list; reload both.
    router.refresh();
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['events'] }),
      floor,
    ]);
  }, [router, queryClient]);

  const { height, state } = usePullToRefresh(refresh);
  if (state === 'idle' && height === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={PINK_WAVE_COPY.loadingShows}
      data-state={state}
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
            : `height var(--motion-base) var(--motion-ease)`,
      }}
    >
      <PinkWave scale="sm" />
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
