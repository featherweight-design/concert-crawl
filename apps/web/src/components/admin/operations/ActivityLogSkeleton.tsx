import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

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

/**
 * `07/loading-activity-log`: the title and subtitle bars, the tab bars, the
 * filter pills, then the log card. The Emails tab and the search box are not
 * built yet, so their bars are left out. No hooks, so the route's
 * `loading.tsx` renders it on the server.
 */
export const ActivityLogSkeleton = () => (
  <div
    data-testid="activity-log-skeleton"
    role="status"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    <span className="sr-only">{ADMIN_COPY.states.loading}</span>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock width={200} height={28} radius={8} />
      <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
    </div>
    <div
      style={{
        display: 'flex',
        gap: 18,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 12,
      }}
    >
      <SkeletonBlock width={90} height={14} radius={6} />
      <SkeletonBlock width={90} height={14} radius={6} />
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map((pill) => (
        <SkeletonBlock key={pill} width={92} height={32} radius={999} />
      ))}
    </div>
    <ActivityLogRowsSkeleton />
  </div>
);
