export default function AdminReviewLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 80, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 200, height: 13 }} />
      </div>

      {/* Section tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 0,
        }}
      >
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 90, height: 32, borderRadius: '6px 6px 0 0' }}
          />
        ))}
      </div>

      {/* Price coverage table */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="admin-skeleton" style={{ width: 160, height: 14 }} />
        </div>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="admin-skeleton"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div
                className="admin-skeleton"
                style={{ width: 160, height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: 100, height: 11 }}
              />
            </div>
            <div
              className="admin-skeleton"
              style={{ width: 60, height: 24, borderRadius: 12 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 80, height: 30, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
