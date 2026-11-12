import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

const card = {
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
} satisfies React.CSSProperties;

const PANEL_LINES = ['85%', '72%', '58%', '45%', '32%'];

const PanelSkeleton = () => (
  <div style={{ ...card, minHeight: 240 }}>
    <SkeletonBlock width={120} height={14} radius={6} />
    {PANEL_LINES.map((width) => (
      <SkeletonBlock key={width} width={width} height={10} radius={5} />
    ))}
  </div>
);

/**
 * `07/loading-health`: the header, four tiles and the two columns. The board
 * is desktop only (gap G14); the phone gets the same blocks, reflowed by the
 * Health grid classes.
 */
export default function AdminHealthLoading() {
  return (
    <div
      data-testid="page-skeleton"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
      </div>
      <div className="health-tiles">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ ...card, minHeight: 160 }}>
            <SkeletonBlock width={120} height={14} radius={6} />
            <SkeletonBlock width="80%" height={10} radius={5} />
            <SkeletonBlock width="60%" height={10} radius={5} />
          </div>
        ))}
      </div>
      <div className="health-columns">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
