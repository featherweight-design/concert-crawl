export default function AdminUsersLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 60, height: 22 }} />
        <div className="admin-skeleton" style={{ width: 160, height: 13 }} />
      </div>

      {/* User list */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 8 }).map((_, idx) => (
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
                width: 32,
                height: 32,
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
                style={{ width: 140, height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: 180, height: 11 }}
              />
            </div>
            <div
              className="admin-skeleton"
              style={{ width: 56, height: 22, borderRadius: 10 }}
            />
            <div className="admin-skeleton" style={{ width: 80, height: 11 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
