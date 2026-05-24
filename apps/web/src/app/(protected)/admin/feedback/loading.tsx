export default function AdminFeedbackLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 90, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 220, height: 13 }} />
      </div>

      {/* Feedback list */}
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
              <div
                className="admin-skeleton"
                style={{ width: 120, height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: 60, height: 11, marginLeft: 'auto' }}
              />
            </div>
            <div
              className="admin-skeleton"
              style={{ width: '80%', height: 13 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: '55%', height: 13 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
