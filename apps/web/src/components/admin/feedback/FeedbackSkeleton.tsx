/** The inbox's list rows, without any heading. */
const FeedbackListSkeleton = () => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}
  >
    {Array.from({ length: 6 }).map((_, idx) => (
      <div
        key={idx}
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="admin-skeleton"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <div className="admin-skeleton" style={{ width: 120, height: 13 }} />
          <div
            className="admin-skeleton"
            style={{ width: 60, height: 11, marginLeft: 'auto' }}
          />
        </div>
        <div className="admin-skeleton" style={{ width: '80%', height: 13 }} />
        <div className="admin-skeleton" style={{ width: '55%', height: 13 }} />
      </div>
    ))}
  </div>
);

/**
 * The feedback inbox's skeleton. `heading` draws the old page's SectionHead
 * bars; Operations leaves it off and draws its shell above instead, so the
 * list stands alone with no wrapper.
 */
export const FeedbackSkeleton = ({ heading = true }: { heading?: boolean }) =>
  heading ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 90, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 220, height: 13 }} />
      </div>
      <FeedbackListSkeleton />
    </div>
  ) : (
    <FeedbackListSkeleton />
  );
