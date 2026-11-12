import { PageSkeleton } from '@/components/admin/primitives';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/**
 * `07/loading-invite-codes`: only the shell's text shows; the title, the
 * three tabs and the rows are placeholders in the loaded page's shape.
 */
export default function AdminInviteCodesLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
      </div>
      <PageSkeleton tabs={3} columns={6} rows={7} rowHeight={57} />
    </div>
  );
}
