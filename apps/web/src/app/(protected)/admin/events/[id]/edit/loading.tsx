import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** Bar widths down a card, as `07/loading-event-edit` draws them. */
const BARS = ['90%', '76%', '62%', '48%', '34%', '20%'];

const SkeletonCard = ({ bars, height }: { bars: number; height: number }) => (
  <div
    style={{
      minHeight: height,
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    <SkeletonBlock width={120} height={14} radius={6} />
    {BARS.slice(0, bars).map((width) => (
      <SkeletonBlock key={width} width={width} height={10} radius={5} />
    ))}
  </div>
);

/**
 * `07/loading-event-edit`: the title and sub bars, then the two columns, Show
 * and From the crawl at the left, Status and Price at the right. Phone stacks
 * them. `SkeletonBlock` holds still under reduced motion.
 */
export default function EventEditLoading() {
  return (
    <div
      data-testid="event-edit-loading"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 80%)" height={12} radius={6} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard bars={6} height={292} />
          <SkeletonCard bars={3} height={152} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard bars={4} height={222} />
          <SkeletonCard bars={4} height={222} />
        </div>
      </div>
    </div>
  );
}
