export default function PricesSubmissionsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 140, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 320, height: 13 }} />
      </div>

      {/* Filter rail — one pill per status filter (All/Pending/Corroborated/
          Disputed/Stale/Archived); keep in sync with FILTER_ORDER so the
          skeleton doesn't reflow when the real rail mounts. */}
      <div
        data-testid="filter-rail-skeleton"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 84, height: 28, borderRadius: 20 }}
          />
        ))}
      </div>

      {/* Table panel */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="admin-skeleton" style={{ width: 180, height: 14 }} />
        </div>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 16 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
