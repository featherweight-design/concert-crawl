'use client';

import { useEffect, useRef } from 'react';

import { runMotion, useReducedMotion } from '@/lib/motion';

interface SkeletonBlockProps {
  width?: number | string;
  height: number | string;
  radius?: number | string;
}

/**
 * A neutral placeholder with a soft sheen that sweeps on --motion-slow (README
 * rule 9). The sheen is static under reduced motion. Decorative: the region
 * that holds skeletons announces loading itself.
 */
export function SkeletonBlock({
  width = '100%',
  height,
  radius = 'var(--radius-sm)',
}: SkeletonBlockProps) {
  const reduced = useReducedMotion();
  const sheenRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const sweep = runMotion(
      sheenRef.current,
      [{ transform: 'translateX(-100%)' }, { transform: 'translateX(100%)' }],
      { duration: 'slow', iterations: Infinity },
    );
    return () => sweep?.cancel();
  }, [reduced]);

  return (
    <span
      aria-hidden="true"
      data-skeleton-sheen={reduced ? 'still' : 'running'}
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        width,
        height,
        borderRadius: radius,
        background: 'var(--surface-2)',
      }}
    >
      <span
        ref={sheenRef}
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'translateX(-100%)',
          background:
            'linear-gradient(90deg, transparent, var(--overlay-hover), transparent)',
        }}
      />
    </span>
  );
}
