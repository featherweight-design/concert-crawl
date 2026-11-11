import { SweepOverlay } from '@/components/ui/skeleton/SweepOverlay';

interface SkeletonBlockProps {
  width?: number | string;
  height: number | string;
  radius?: number | string;
}

/**
 * A neutral placeholder block (README rule 9) carrying the app's one skeleton
 * sweep, `SweepOverlay`, so B+ skeletons sweep the same as every existing
 * loading placeholder. The sweep is hidden under reduced motion by the global
 * `.dl-sweep` rule. No hooks, so server route fallbacks can render it.
 */
export function SkeletonBlock({
  width = '100%',
  height,
  radius = 'var(--radius-sm)',
}: SkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
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
      <SweepOverlay />
    </span>
  );
}
