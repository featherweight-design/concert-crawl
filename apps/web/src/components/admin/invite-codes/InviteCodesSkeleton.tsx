import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** Title bar widths per row, as `07/loading-invite-codes` draws them. */
const ROW_WIDTHS = ['38%', '55%', '42%', '59%', '46%', '63%'] as const;
/** The three trailing column bars. */
const TAIL = [82, 94, 106] as const;

/** One bar that may shrink on a narrow screen rather than overflow. */
const Bar = ({ width, height }: { width: number; height: number }) => (
  <span style={{ flex: `0 1 ${width}px`, minWidth: 0 }}>
    <SkeletonBlock height={height} radius={6} />
  </span>
);

/**
 * The list's loading rows (`07/loading-invite-codes`): a card with a header
 * bar, then six rows of title, sub, chip and three columns, fading out. No
 * hooks, so the route's `loading.tsx` renders it on the server.
 * `07/loading-people` draws the same rows with an avatar and two columns.
 */
export const InviteCodesRowsSkeleton = ({
  avatar = false,
  tail = TAIL,
}: {
  avatar?: boolean;
  tail?: readonly number[];
} = {}) => (
  <div
    data-testid="page-skeleton"
    aria-busy="true"
    style={{
      borderRadius: 14,
      border: '1px solid var(--border)',
      // Both loading boards draw the card on surface-1 (#11162E).
      background: 'var(--surface-1)',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: '14px 18px' }}>
      <SkeletonBlock width="40%" height={9} radius={6} />
    </div>
    {ROW_WIDTHS.map((width, row) => (
      <div
        key={width}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '13px 18px',
          borderTop: '1px solid var(--border)',
          opacity: 1 - row * 0.12,
        }}
      >
        {avatar && (
          <span style={{ flex: 'none' }}>
            <SkeletonBlock width={32} height={32} radius={999} />
          </span>
        )}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          <SkeletonBlock width={width} height={13} radius={6} />
          <SkeletonBlock width="22%" height={9} radius={6} />
        </div>
        <span style={{ flex: '0 0 70px' }}>
          <SkeletonBlock height={20} radius={999} />
        </span>
        {tail.map((width) => (
          <Bar key={width} width={width} height={11} />
        ))}
      </div>
    ))}
  </div>
);

/** The whole page while the route loads: title, sub, tabs, then the rows. */
export const InviteCodesSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock width={200} height={28} radius={8} />
      <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
    </div>
    <div
      style={{
        display: 'flex',
        gap: 18,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {[0, 1, 2].map((tab) => (
        <SkeletonBlock key={tab} width={90} height={14} radius={6} />
      ))}
    </div>
    <InviteCodesRowsSkeleton />
  </div>
);
