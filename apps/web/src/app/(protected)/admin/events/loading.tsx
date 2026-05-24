export default function AdminEventsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SectionHead */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="admin-skeleton" style={{ width: 70, height: 22 }} />
          <div className="admin-skeleton" style={{ width: 160, height: 13 }} />
        </div>
        <div
          className="admin-skeleton"
          style={{ width: 90, height: 34, borderRadius: 8 }}
        />
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="admin-skeleton"
            style={{ width: 80, height: 30, borderRadius: 20 }}
          />
        ))}
      </div>

      {/* Events table */}
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
            padding: '10px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px 80px',
            gap: 12,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="admin-skeleton"
              style={{ height: 11, width: idx === 0 ? 60 : '100%' }}
            />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: '1fr 120px 80px 80px',
              gap: 12,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                className="admin-skeleton"
                style={{ width: 180, height: 13 }}
              />
              <div
                className="admin-skeleton"
                style={{ width: 110, height: 11 }}
              />
            </div>
            <div
              className="admin-skeleton"
              style={{ width: '100%', height: 13 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 60, height: 22, borderRadius: 10 }}
            />
            <div
              className="admin-skeleton"
              style={{ width: 60, height: 28, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
