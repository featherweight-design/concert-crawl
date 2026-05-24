export default function AdminDashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="admin-skeleton" style={{ width: 220, height: 28 }} />
        <div className="admin-skeleton" style={{ width: 160, height: 14 }} />
      </div>

      {/* Stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="admin-skeleton" style={{ width: 80, height: 12 }} />
            <div className="admin-skeleton" style={{ width: 56, height: 28 }} />
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 8, borderRadius: 4 }}
            />
          </div>
        ))}
      </div>

      {/* Attention feed */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div className="admin-skeleton" style={{ width: 120, height: 14 }} />
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <div
              className="admin-skeleton"
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }}
            />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                className="admin-skeleton"
                style={{ width: '60%', height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: '40%', height: 11 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Crawl health table */}
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
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
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
              className="admin-skeleton"
              style={{ width: 140, height: 13 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 64, height: 13, marginLeft: 'auto' }}
            />
            <div className="admin-skeleton" style={{ width: 52, height: 13 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
