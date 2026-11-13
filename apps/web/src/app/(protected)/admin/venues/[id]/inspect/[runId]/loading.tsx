import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** The rows under the tabs, fading as the board draws them. */
const ROWS = [
  { width: '50%', opacity: 1 },
  { width: '63%', opacity: 0.86 },
  { width: '76%', opacity: 0.72 },
  { width: '59%', opacity: 0.58 },
  { width: '72%', opacity: 0.44 },
  { width: '55%', opacity: 0.3 },
];

/**
 * Inspect loading (`G2/inspect-loading`): the title, its line and the chip
 * row, then the tab bar, a line, and six fading rows.
 */
export default function InspectLoading() {
  return (
    <div
      data-testid="inspect-skeleton"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock width="40%" height={22} radius={8} />
        <SkeletonBlock width="60%" height={12} radius={6} />
        <SkeletonBlock width="70%" height={20} radius={999} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBlock height={40} radius={10} />
        <SkeletonBlock width="90%" height={11} radius={6} />
        {ROWS.map(({ width, opacity }) => (
          <div
            key={width}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 0',
              borderTop: '1px solid var(--border)',
              opacity,
            }}
          >
            <SkeletonBlock width={width} height={13} radius={6} />
            <span style={{ flex: 1 }} />
            <SkeletonBlock width={84} height={22} radius={999} />
          </div>
        ))}
      </div>
    </div>
  );
}
