import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { InviteCodesRowsSkeleton } from '../invite-codes/InviteCodesSkeleton';

/** `07/loading-people`'s two trailing column bars. */
const PEOPLE_TAIL = [82, 94] as const;

/** The list's loading rows: avatar, handle, role chip, two columns. */
export const PeopleRowsSkeleton = () => (
  <InviteCodesRowsSkeleton avatar tail={PEOPLE_TAIL} />
);

/**
 * `07/loading-people`: title, sub, three tabs, the search and four chips,
 * then the rows. No hooks, so the route's `loading.tsx` renders it.
 */
export const PeopleSkeleton = () => (
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
    <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
      <span style={{ flex: '0 1 260px', minWidth: 0 }}>
        <SkeletonBlock height={36} radius={10} />
      </span>
      {[0, 1, 2, 3].map((chip) => (
        <span key={chip} style={{ flex: 'none' }}>
          <SkeletonBlock width={92} height={32} radius={999} />
        </span>
      ))}
    </div>
    <PeopleRowsSkeleton />
  </div>
);
