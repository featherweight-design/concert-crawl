import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** Each row's title bar width, top to bottom, as the board draws them. */
const TITLE_WIDTHS = ['38%', '55%', '42%', '59%', '46%', '63%'] as const;
/** The rows fade down the card. */
const ROW_OPACITY = [1, 0.88, 0.76, 0.64, 0.52, 0.4] as const;

/** The log card's rows alone: the tab's own loading, under the live filters. */
export const ActivityLogRowsSkeleton = () => (
  <div
    data-testid="activity-log-skeleton-rows"
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
        data-testid="activity-log-skeleton-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '13px 18px',
          borderTop: '1px solid var(--border)',
          opacity: ROW_OPACITY[row],
        }}
      >
        <SkeletonBlock width={24} height={24} radius={999} />
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
      </div>
    ))}
  </div>
);
