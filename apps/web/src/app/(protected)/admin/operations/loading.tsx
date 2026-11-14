import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FeedbackSkeleton } from '@/components/admin/feedback/FeedbackSkeleton';

/**
 * `07/loading-activity-log`'s chrome: the title and subtitle bars, then the
 * tab strip with one pill per drawn tab (only Feedback so far). Feedback is
 * the default tab, so its list skeleton follows, without its own heading.
 */
export default function AdminOperationsLoading() {
  return (
    <div
      data-testid="operations-skeleton"
      role="status"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <span className="sr-only">{ADMIN_COPY.states.loading}</span>
      {/* The phone header carries the title, so admin.css hides these. */}
      <div
        data-testid="operations-skeleton-head"
        className="operations-skeleton-head"
        style={{ flexDirection: 'column', gap: 8 }}
      >
        <div
          className="admin-skeleton"
          style={{ width: 200, height: 28, borderRadius: 8 }}
        />
        <div
          className="admin-skeleton"
          style={{ width: 'min(380px, 80%)', height: 12, borderRadius: 6 }}
        />
      </div>
      <div
        data-testid="operations-skeleton-tabs"
        style={{
          display: 'flex',
          gap: 18,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        <div
          data-testid="operations-skeleton-tab"
          className="admin-skeleton"
          style={{ width: 90, height: 14, borderRadius: 6 }}
        />
      </div>
      <FeedbackSkeleton />
    </div>
  );
}
