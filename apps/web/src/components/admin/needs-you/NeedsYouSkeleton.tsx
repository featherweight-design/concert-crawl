import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/**
 * `07/loading-needs-you`: the title and its line, the six pills, then four
 * cards. No hooks, so the route's `loading.tsx` renders it.
 */
export const NeedsYouSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock width={180} height={30} radius={8} />
      <SkeletonBlock width="min(340px, 100%)" height={12} radius={6} />
    </div>
    <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
      {[0, 1, 2, 3, 4, 5].map((pill) => (
        <span key={pill} style={{ flex: 'none' }}>
          <SkeletonBlock width={88} height={32} radius={999} />
        </span>
      ))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2, 3].map((card) => (
        <SkeletonBlock key={card} height={132} radius={14} />
      ))}
    </div>
  </div>
);
