import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** Each row's title bar width, top to bottom, as the board draws them. */
const TITLE_WIDTHS = ['38%', '55%', '42%'] as const;
/** The rows fade down the card. */
const ROW_OPACITY = [1, 0.88, 0.76] as const;

/**
 * `07/loading-feature-flags`: the title and subtitle bars, then one card with
 * a header bar and three flag rows (name and key bars, a state pill, a short
 * bar). Rows carry no leading tile. No hooks, so the route's `loading.tsx`
 * renders it on the server.
 */
export const FeatureFlagsSkeleton = () => (
  <div
    data-testid="feature-flags-skeleton"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock width={200} height={28} radius={8} />
      <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
    </div>
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 18px' }}>
        <SkeletonBlock width="40%" height={9} radius={6} />
      </div>
      {TITLE_WIDTHS.map((titleWidth, row) => (
        <div
          key={titleWidth}
          data-testid="feature-flags-skeleton-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '13px 18px',
            borderTop: '1px solid var(--border)',
            opacity: ROW_OPACITY[row],
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}
          >
            <SkeletonBlock width={titleWidth} height={13} radius={6} />
            <SkeletonBlock width="22%" height={9} radius={6} />
          </div>
          <span style={{ flex: 'none' }}>
            <SkeletonBlock width={70} height={20} radius={999} />
          </span>
          <span style={{ flex: 'none' }}>
            <SkeletonBlock width={82} height={11} radius={6} />
          </span>
        </div>
      ))}
    </div>
  </div>
);
