import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

const CARD = {
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-1)',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
} as const;

const Lines = ({ widths }: { widths: readonly string[] }) => (
  <>
    <SkeletonBlock width={120} height={15} radius={6} />
    {widths.map((width) => (
      <SkeletonBlock key={width} width={width} height={11} radius={6} />
    ))}
  </>
);

/**
 * `07/loading-person`: the head, four stat cards and two blocks. The grids
 * fold to one column on a narrow screen. No hooks, so the route's
 * `loading.tsx` renders it.
 */
export const PersonSkeleton = () => (
  <div
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <SkeletonBlock width={56} height={56} radius={999} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock width={180} height={24} radius={6} />
        <SkeletonBlock width="min(300px, 50vw)" height={11} radius={6} />
      </div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 14,
      }}
    >
      {[0, 1, 2, 3].map((card) => (
        <div key={card} style={{ ...CARD, height: 78 }}>
          <Lines widths={['90%', '76%']} />
        </div>
      ))}
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {[0, 1].map((card) => (
        <div key={card} style={{ ...CARD, height: 180 }}>
          <Lines widths={['90%', '76%', '62%', '48%']} />
        </div>
      ))}
    </div>
  </div>
);
